# Shared engagement forms: manual QA

No commits are created. These adjustments reuse the existing booking schedule/address columns; no new database migration is required for this change.

Run the backend and reload the Expo app. Test both account roles through public posting and the chat calendar / offer action:

1. Select Cleaning, Child Care, Cooking, Caregiver and Laundry one at a time. The fifth selection replaces the five with All-around. Tapping an individual service from All-around selects that individual alone. Selecting All-around again clears it.
2. For Short-term, choose an explicit availability date and Morning (08:00–12:00), Afternoon (12:00–17:00) or Night (17:00–21:00). All times are Philippine time. No hidden tomorrow date is generated. Past dates are disabled; a shift that already started today is rejected.
3. For Long-term, select a start date, end date, daily hours and Mon–Sun working days. The start date must be a working day and the engagement must last at least 24 hours. Posting Step 2 now shows the work region selector; finish Province, City / Municipality, Barangay, street and ZIP in Step 3. Chat offers use the same full PSGC address controls.
4. Change a region, province or city. Its dependent selections clear. Changing regions refreshes the applicable wage policy. Unsupported long-term regions cannot be submitted; reconnect if the policy is unavailable.
5. Review the posting summary and saved chat offer. Verify category, work setup, rate period, dates, hours and days. Reload the chat to confirm the values are read from the saved offer.
6. Accept an offer from the counterpart account, and confirm the booking appears in My Bookings / My Jobs & Contracts. Existing historic offers are displayed as stored; no fabricated terms are added.

Database expectations: `tbl_booking.service_category`, `work_setup`, `start_time`, `end_time`, `work_days`, `daily_start_time`, `daily_end_time`, `region`, `province`, `city`, `barangay`, `street`, `floor_number`, `zip_code`, `rate_amount`, `rate_period`. Short-term days derive from the selected service date. The UI displays Mon–Sun but keeps the backend codes M/T/W/Th/F/S/Su.

Registration work setup remains a worker profile preference, separate from the terms of each post or offer.

## Guided chat offer

The chat offer form now has four steps: Service & Setup → Schedule → Location & Pay → Review. Only the review step can send an offer.

- Use Next with missing fields: an inline error should identify what to enter, and the form should stay on the current step.
- Use Back and the completed progress segments: the entered service selections, dates, schedule and address should remain intact.
- On Review, use Edit for each section. Check that changes appear when you return to Review.
- Changing Short-term / Long-term intentionally clears incompatible working days, hours, end date and pay. The chosen work address is preserved.
- Check the daily / monthly minimum pay hint. If loading fails, Retry refreshes it; an unavailable policy blocks Review and Send.
- Try a server rejection or network failure when sending: the form should remain open with the entered terms. Successful sending stays disabled until the modal closes.
- Open a received or previously sent offer: it should show a compact saved summary, with the existing real Accept / Decline actions where applicable.
- Check a small phone and a large font setting. The page should scroll, buttons should stay reachable, and the keyboard should not obscure the bottom actions.
