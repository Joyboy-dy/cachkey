# Form notifications

Use inline messages for errors tied to specific fields. Use a toast/banner/global notification for asynchronous or global outcomes such as “saved”, network failure, authorization failure, or background processing.

Reuse the notification system already installed. Avoid reporting the same issue in several channels unless each serves a distinct purpose.

Success notifications should occur only after authoritative success. Error copy should tell the user what they can do next without exposing internal stack traces or raw provider responses.
