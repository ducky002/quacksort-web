# Google Forms Backend Setup

The website now uses a QuackSort-styled form. Its Apps Script backend saves each response into the Google Form. It does not create calendar events, send email, or provide a route for reading responses.

## Update the Apps Script deployment

1. Sign in to [script.google.com](https://script.google.com/) with the same Google account that owns the Form and the web app deployment.
2. Open the project behind the current `/exec` URL. Replace all of `Code.gs` with `quacksort-web/booking_backend/Code.gs` and save it.
3. In the function selector, choose `authorizeFormAccess`, click **Run**, and approve Google Forms access if prompted.
4. Choose **Deploy > Manage deployments**, edit the current web app deployment, select **New version**, and deploy. Keep **Execute as** set to your account and **Who has access** set to **Anyone**. The `/exec` URL should stay the same.
5. Submit a test from the website and check the Form's **Responses** tab. The date is recorded as a response only; no calendar is touched.
6. If the site reports a save error, open **Executions**, select the latest `doPost`, and inspect its logs. A missing-question error now includes the available question titles and item types; use those to correct the title mapping in `Code.gs`.

The backend is public so the website can submit to it, but accepts only new responses, applies field validation, a honeypot, and a brief per-email cooldown. It does not return stored response data. Review the Form's responder settings and any linked response spreadsheet.