# [OPEN] Razorpay checkout bug

## Symptom
- User clicks `Start full test`, but the paid flow does not complete as expected.
- Expected behavior: user pays first, then the 40-question paid test starts.

## Scope
- Frontend payment modal and Razorpay checkout flow
- Backend `/api/order` and `/api/verify` integration

## Initial Hypotheses
- H1: `openPayment()` is not firing or is throwing before the modal fully opens.
- H2: `/api/order` returns data that does not match what Razorpay Checkout expects.
- H3: Razorpay Checkout script loads, but the configured key/order combination is invalid for the current environment.
- H4: The frontend success handler never runs because checkout dismisses or errors before payment completion.
- H5: `/api/verify` rejects the signature because backend credentials do not match the checkout key used on the frontend.

## Plan
- Add runtime instrumentation only.
- Reproduce the bug and collect logs.
- Confirm or reject hypotheses with evidence.
- Apply a minimal fix only after evidence is collected.

## Evidence
- H1 rejected: `openPayment()` fires consistently and the modal DOM exists.
- H1 refined: the modal receives the `open` class, but computed style showed `display: none` and zero height before the fix.
- Root cause 1 confirmed: a malformed `@media print` block leaked `.modal-overlay { display:none!important }` into normal rendering, hiding the payment modal.
- Root cause 2 confirmed: backend `/api/order` was operating without Razorpay credentials, so real payment could not be created.

## Fixes Applied
- Corrected the malformed print CSS so the payment modal renders normally.
- Removed the fake local unlock path for paid tests.
- Changed `/api/order` to return `503` when Razorpay is not configured, enforcing pay-before-start behavior.

## Current Status
- User confirmed Razorpay path is now reachable after the CSS fix.
- Backend now blocks fake paid unlocks until valid Razorpay keys are configured.
