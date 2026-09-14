// Contact form backend for maplegardenwellbeing.co.uk.
//
// This is NOT deployed automatically — it's a copy of the script pasted into
// the Google Sheet ("Maple Garden — Contact Enquiries", owned by
// maplegardenwellbeing@gmail.com) via Extensions → Apps Script. There is no
// clasp/API link between this repo and that project, so if you change this
// file, you must also paste the change into the Sheet's script editor and
// redeploy: Deploy → Manage deployments → edit → New version (saving alone
// does not update the live /exec URL that contact.html posts to).
//
// Row layout in the sheet: Timestamp | Name | Email | Phone | Treatment | Message

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var p = e.parameter || {};

  // Honeypot: if this hidden field got filled in, it's a bot — skip logging/emailing
  if (!p._honey) {
    var row = sheet.getLastRow() + 1;

    // Force the Phone column to plain text before writing so Sheets doesn't
    // auto-convert the value to a number and strip a leading 0 or mangle it.
    sheet.getRange(row, 4).setNumberFormat('@');

    sheet.getRange(row, 1, 1, 6).setValues([[
      Utilities.formatDate(new Date(), 'Europe/London', 'dd/MM/yyyy HH:mm:ss'),
      p.Name || '',
      p.Email || '',
      p.Phone || '',
      p.Treatment || '',
      p.Message || ''
    ]]);

    MailApp.sendEmail({
      to: 'maplegardenwellbeing@gmail.com',
      replyTo: p.Email || '',
      subject: 'New enquiry from Maple Garden website',
      body: 'Name: ' + (p.Name || '') + '\n' +
            'Email: ' + (p.Email || '') + '\n' +
            'Phone: ' + (p.Phone || '') + '\n' +
            'Treatment: ' + (p.Treatment || '') + '\n\n' +
            'Message:\n' + (p.Message || '')
    });
  }

  // Apps Script web app responses render inside a script.googleusercontent.com
  // iframe wrapped by a script.google.com page. A plain window.location.href
  // redirect only escapes the iframe, leaving the script.google.com URL in
  // the address bar — window.top.location.href breaks out to the real top
  // frame so the visitor actually lands on contact.html?sent=1.
  return HtmlService.createHtmlOutput(
    '<script>window.top.location.href="https://maplegardenwellbeing.co.uk/contact.html?sent=1";</script>' +
    'Thank you — redirecting...'
  );
}

function doGet() {
  return HtmlService.createHtmlOutput('This endpoint only accepts POST submissions.');
}
