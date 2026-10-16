# Face verification transition performance

Previously, Step 3 ran camera startup, human alignment/left/right/three-second
hold, photo capture, phone-to-Django upload, synchronous Django-to-Cloudinary
upload, and a 500 ms success delay sequentially. The document-upload stopwatch
does not include those face-check interactions, so the two totals measure
different work. Full-resolution camera output and mapping every landmark event
on the JavaScript thread can add device-dependent cost.

## Current path

1. Keep the same liveness sequence and three-second hold.
2. Request a camera format close to a 1280 × 960 selfie and 640 × 480 preview,
   with speed-prioritized capture. Hardware may choose the nearest format.
3. Limit JavaScript landmark mapping/UI updates to ten per second; ignore results
   once the face check passes. Keep the native frame processor attached during
   photo capture so Android does not rebuild its camera outputs while capturing.
   Navigation then unmounts the camera and releases the processor.
4. Capture the selfie and immediately open document selection, without an
   artificial success delay or waiting for Cloudinary.
5. Registration owns a single in-flight upload while the user chooses documents.
   A pending save is shared across repeated finish taps. A failure stays visible
   with an explicit retry; Submit, Skip, and Cancel cannot complete registration
   before the selfie save is confirmed. Returning to retake is disabled while
   the current save is running so old and new selfies cannot race.

This is an in-app foreground upload, not an OS background worker or a durable
server job. Killing the application can interrupt it. The server still returns
success only after Cloudinary and the database confirm persistence. No new
native dependencies, database tables, workers, or migrations are needed.

The change reduces image dimensions at capture rather than installing another
native image compressor. Validate selfie clarity on target phones before
lowering resolution further.

## Measure on a physical device

Use a release/dev-client build with the updated JavaScript and backend. Keep the
same phone, connection, lighting, and start/end points across trials. Test both
first camera startup and repeated runs.

Filter device logs for `[Liveness timing]`:

- `first_landmarks.durationMs`: Continue tap to first tracked face, including
  camera/model startup.
- `turnLeft`, `turnRight`, `still`, `verified`: cumulative milliseconds from
  Continue to each step transition. Differences show tracking/interaction time.
- `documents_ready.captureMs`: photo capture time after the check passes.
- `documents_ready.durationMs`: Continue-to-document-selection transition.
- `selfie_dimensions`: actual width/height selected by the phone.
- `selfie_upload_response.durationMs`: phone request/response time, which now
  overlaps document selection instead of extending Step 3.
- `selfie_upload_response.serverTiming`: Django `Server-Timing` header,
  including `cloudinary`, `profile_save`, and total `profile_request` durations.
  The total excludes authentication before the view and transfer before/after
  the view, so the difference from client time includes those costs.

No photos, file paths, tokens, names, or account identifiers are logged by these
measurements. They do not measure per-frame native inference separately.

Target **under 8–10 seconds from Continue to document selection** on supported
phones with prompt face movements. This is a target to verify, not a measured
result or guarantee. Human speed and camera/model initialization remain in that
path; Cloudinary latency does not. Test a failed/slow upload: document selection
should remain usable, while finishing registration must wait or show a retry.
Also test a capture failure: the face screen must offer Retry and must not advance.

## Checks

```text
npm run typecheck
node --test tests/selfie-upload.test.cjs tests/liveness-flow.test.cjs
```

Backend (use its virtual environment):

```text
venv\Scripts\python.exe manage.py test accounts.test_profile_images --settings=Serbisure.test_settings --noinput
```
