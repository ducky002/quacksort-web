# Google Forms Backend Setup

The website now uses a QuackSort-styled form. Its Apps Script backend saves each response into the Google Form. It does not create calendar events, send email, or provide a route for reading responses.

## Replace the old deployment

The previously shared `/exec` URL was deployed from a calendar-and-email script. Do not connect the site to that version.

1. Sign in to [script.google.com](https://script.google.com/) with the same Google account that owns the Form and the existing web app deployment.
2. Open the project used for the shared `/exec` URL. Replace all of `Code.gs` with `quacksort-web/booking_backend/Code.gs` and save it.
3. In the function selector, choose `authorizeFormAccess`, click **Run**, and approve Google Forms access.
4. Choose **Deploy > Manage deployments**, edit the existing web app deployment, select **New version**, and deploy. Keep **Execute as** set to your account and **Who has access** set to **Anyone**. Updating the existing deployment should preserve its `/exec` URL; copy it again to confirm.
5. Send me the resulting `/exec` URL. The website's submit button stays disabled until the backend URL is configured.
6. After it is connected, submit a test response and check the Form's **Responses** tab. The date is recorded as a response only; no calendar is touched.

The backend is public so the website can submit to it, but accepts only new responses, applies field validation, a honeypot, and a brief per-email cooldown. It does not return stored response data. Review the Form's responder settings and any linked response spreadsheet.