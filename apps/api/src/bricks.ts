import {
  type BrickDto,
  brickSchema,
  MAX_BRICKS,
  SHARED_BRICK_SLUG,
  slugify,
} from "@cachkey/shared";
import { Elysia } from "elysia";
import { type AuditActor, audit } from "./audit";
import { prisma } from "./db";
import { HttpError, httpErrors, type Membership, requireProject } from "./guards";
import { type BrickRow, projectBricks } from "./secrets";

/*
 * Bricks of a project, under /api/projects/:slug/bricks: independent parts (front-end,
 * API…) with their own variables. Everyone who sees the project sees its bricks; owners and
 * admins add, rename and delete them. The main brick cannot be deleted and the shared
 * variables are not a brick of the list (see packages/shared/src/brick-schemas.ts).
 */

function actorOf(membership: Membership): AuditActor {
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    userName: membership.userName,
  };
}

function brickDto(brick: BrickRow): BrickDto {
  return { id: brick.id, name: brick.name, slug: brick.slug, main: brick.kind === "main" };
}

/** The brick of the URL, never the shared variables. */
async function findBrick(projectId: string, slug: string): Promise<BrickRow> {
  const brick = await prisma.brick.findUnique({
    where: { projectId_slug: { projectId, slug } },
    select: { id: true, name: true, slug: true, kind: true },
  });
  if (!brick || brick.kind === "shared") throw new HttpError(404, "BRICK_NOT_FOUND");
  return brick;
}

function parseName(body: unknown): string {
  const parsed = brickSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR");
  return parsed.data.name;
}

/** `shared` is reserved for the shared variables (`--brick shared`). */
function availableSlug(bricks: BrickRow[], name: string): string {
  const taken = new Set([SHARED_BRICK_SLUG, ...bricks.map((brick) => brick.slug)]);
  const base = slugify(name) || "brique";
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export const brickRoutes = new Elysia({ prefix: "/api/projects/:slug/bricks" })
  .use(httpErrors)

  .get("/", async ({ request, params }): Promise<BrickDto[]> => {
    const { project } = await requireProject(request.headers, params.slug);
    const bricks = await projectBricks(project.id);
    return bricks.filter((brick) => brick.kind !== "shared").map(brickDto);
  })

  .post("/", async ({ request, params, body, set }): Promise<BrickDto> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const name = parseName(body);
    const bricks = await projectBricks(project.id);
    const listed = bricks.filter((brick) => brick.kind !== "shared");
    if (listed.length >= MAX_BRICKS) throw new HttpError(409, "TOO_MANY_BRICKS");
    if (listed.some((brick) => brick.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, "BRICK_ALREADY_EXISTS");
    }
    const created = await prisma.brick.create({
      data: {
        projectId: project.id,
        name,
        slug: availableSlug(bricks, name),
        kind: "custom",
        position: listed.length,
      },
      select: { id: true, name: true, slug: true, kind: true },
    });
    await audit(
      actorOf(membership),
      { action: "brick.created", project, brickName: name },
      request,
    );
    set.status = 201;
    return brickDto(created);
  })

  // The slug stays stable on rename so linked folders and tokens keep working.
  .patch("/:brick", async ({ request, params, body }): Promise<BrickDto> => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const brick = await findBrick(project.id, params.brick);
    const name = parseName(body);
    const others = (await projectBricks(project.id)).filter(
      (item) => item.kind !== "shared" && item.id !== brick.id,
    );
    if (others.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, "BRICK_ALREADY_EXISTS");
    }
    if (name !== brick.name) {
      await prisma.brick.update({ where: { id: brick.id }, data: { name } });
      await audit(
        actorOf(membership),
        { action: "brick.renamed", project, brickName: name, details: { from: brick.name } },
        request,
      );
    }
    return brickDto({ ...brick, name });
  })

  /** Deletes the brick's variables (every environment) and its tokens with it. */
  .delete("/:brick", async ({ request, params }) => {
    const { membership, project } = await requireProject(request.headers, params.slug, "manage");
    const brick = await findBrick(project.id, params.brick);
    if (brick.kind === "main") throw new HttpError(409, "MAIN_BRICK_REQUIRED");
    const [variables, tokens] = await Promise.all([
      prisma.secret.count({ where: { brickId: brick.id } }),
      prisma.serviceToken.count({ where: { brickId: brick.id } }),
    ]);
    await prisma.brick.delete({ where: { id: brick.id } });
    await audit(
      actorOf(membership),
      { action: "brick.deleted", project, brickName: brick.name, details: { variables, tokens } },
      request,
    );
    return { status: true };
  });
