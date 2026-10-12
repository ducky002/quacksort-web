const GOOGLE_FORM_ID = '1FAIpQLSemqGAQVOulgctcoKzyerzqyWCuU3_km3IXkTAazg2LVBMXeA';
const EMAIL_COOLDOWN_SECONDS = 60;

function authorizeFormAccess() {
  const form = FormApp.openById(GOOGLE_FORM_ID);
  console.log(`Authorized for form: ${form.getTitle()}`);
}

function doPost(event) {
  const params = event && event.parameter ? event.parameter : {};
  const requestId = /^[a-f0-9]{32}$/.test(params.requestId || '') ? params.requestId : '';

  if (params.website) {
    return resultPage(requestId, true, '');
  }

  let submission;
  try {
    submission = validateSubmission(params);
  } catch (error) {
    return resultPage(requestId, false, 'Please check the required fields and try again.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return resultPage(requestId, false, 'The form is busy. Please try again.');
  }

  let failureStage = 'opening the Google Form';
  try {
    const cache = CacheService.getScriptCache();
    if (requestId && cache.get(`request:${requestId}`)) {
      return resultPage(requestId, true, '');
    }

    const emailKey = `email:${digest(submission.email)}`;
    if (cache.get(emailKey)) {
      return resultPage(requestId, false, 'A recent response from this email was already received. Please wait before trying again.');
    }

    const form = FormApp.openById(GOOGLE_FORM_ID);
    failureStage = 'creating the Form response';
    const response = form.createResponse();
    failureStage = 'adding the Name answer';
    response.withItemResponse(createTextResponse(form, ['Name'], submission.name));
    failureStage = 'adding the Email answer';
    response.withItemResponse(createTextResponse(form, ['Email'], submission.email));
    failureStage = 'adding the Profession answer';
    response.withItemResponse(createTextResponse(form, ['Profession', 'Pofession'], submission.profession));
    failureStage = 'adding the current photo workflow answer';
    response.withItemResponse(createTextResponse(form, [
      'What do you use to manage and sort large volume of event photos?',
      'What are you using now?'
    ], submission.currentTool));
    failureStage = 'adding the demo date';
    response.withItemResponse(createDateResponse(form, [
      'When would you like to have a demo?',
      'Preferred demo date'
    ], submission.demoDate));
    failureStage = 'submitting the response to Google Forms';
    response.submit();

    failureStage = 'finalizing the response';
    cache.put(emailKey, '1', EMAIL_COOLDOWN_SECONDS);
    if (requestId) cache.put(`request:${requestId}`, '1', 21600);
  } catch (error) {
    console.error(`Google Form response failed while ${failureStage}: ${error.message}`);
    return resultPage(requestId, false, getPublicSubmissionError(error, failureStage));
  } finally {
    lock.releaseLock();
  }

  return resultPage(requestId, true, '');
}

function getPublicSubmissionError(error, failureStage) {
  const message = String(error && error.message ? error.message : error || '');
  const missingQuestion = message.match(/Required Google Form question is missing: (.+)$/);
  if (missingQuestion) {
    return `Form setup issue: Google Form question not found: "${missingQuestion[1]}".`;
  }

  const unsupportedType = message.match(/Form question has an unsupported type: (.+)$/);
  if (unsupportedType) {
    return `Form setup issue: "${unsupportedType[1]}" must be a short-answer or paragraph question.`;
  }

  const invalidDateType = message.match(/Form question must be a date: (.+)$/);
  if (invalidDateType) {
    return `Form setup issue: "${invalidDateType[1]}" must be a Date question.`;
  }

  if (/permission|not authorized|authorization/i.test(message)) {
    return 'Apps Script cannot access this Form. Run authorizeFormAccess and confirm the script account can edit the Form.';
  }

  return `Google Forms failed while ${failureStage}. Check that the Form is accepting responses and the mapped questions are still present, then try again.`;
}

function validateSubmission(params) {
  const name = cleanField(params.name, 100);
  const email = cleanField(params.email, 254);
  const profession = cleanField(params.profession, 100);
  const currentTool = cleanField(params.currentTool, 500);
  const demoDate = String(params.demoDate || '');

  if (!name || !profession || !currentTool || !isValidEmail(email)) {
    throw new Error('Invalid contact details.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(demoDate)) {
    throw new Error('Invalid demo date.');
  }

  const [year, month, day] = demoDate.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
    throw new Error('Invalid demo date.');
  }

  return { name, email, profession, currentTool, demoDate: { year, month, day } };
}

function createTextResponse(form, titles, value) {
  const item = findFormItem(form, titles);
  if (item.getType() === FormApp.ItemType.PARAGRAPH_TEXT) {
    return item.asParagraphTextItem().createResponse(value);
  }
  if (item.getType() === FormApp.ItemType.TEXT) {
    return item.asTextItem().createResponse(value);
  }
  throw new Error(`Form question has an unsupported type: ${item.getTitle()}`);
}

function createDateResponse(form, titles, date) {
  const item = findFormItem(form, titles);
  if (item.getType() !== FormApp.ItemType.DATE) {
    throw new Error(`Form question must be a date: ${item.getTitle()}`);
  }
  return item.asDateItem().createResponse(new Date(date.year, date.month - 1, date.day));
}

function findFormItem(form, titles) {
  const normalizeTitle = title => String(title || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const titleSet = new Set(titles.map(normalizeTitle));
  const items = form.getItems();
  const item = items.find(candidate => titleSet.has(normalizeTitle(candidate.getTitle())));
  if (!item) {
    const availableTitles = items.map(candidate => `${candidate.getType()}: ${JSON.stringify(candidate.getTitle())}`).join(' | ');
    console.error(`Required question not found: ${titles[0]}. Available form items: ${availableTitles}`);
    throw new Error(`Required Google Form question is missing: ${titles[0]}`);
  }
  return item;
}

function cleanField(value, maxLength) {
  if (typeof value !== 'string' || value.length > maxLength) return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isValidEmail(email) {
  if (email.length > 254 || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)) {
    return false;
  }
  return email.split('@')[0].length <= 64;
}

function digest(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value.toLowerCase())
    .map(byte => (byte + 256).toString(16).slice(-2))
    .join('');
}

function resultPage(requestId, success, message) {
  const result = {
    type: 'quacksort-booking-result',
    requestId: requestId,
    success: success,
    message: message
  };
  const encodedResult = JSON.stringify(JSON.stringify(result));
  const html = `<script>window.top.postMessage(JSON.parse(${encodedResult}), '*');</script>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}