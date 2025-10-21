const screenOrder = [
  'screen-welcome',
  'screen-background',
  'screen-party',
  'screen-delivery',
  'screen-payment',
  'screen-review',
  'screen-receipt'
];

const progressScreens = [
  'screen-background',
  'screen-party',
  'screen-delivery',
  'screen-payment',
  'screen-review'
];

const state = {
  background: null,
  backgroundSource: null,
  customBackgroundData: null,
  partyName: '',
  peopleCount: null,
  deliveryMethod: null,
  prints: 0,
  emailCount: 0,
  emails: [],
  paymentMethod: null,
  selfieData: null
};

let currentScreenIndex = 0;
let currentKeyboardInput = null;
let keyboardValue = '';
let selfieStream = null;
let appConfig = null;
let pendingReceipt = null;

const backgroundGradients = {
  'fsu-garnet': 'linear-gradient(135deg, #782F40, #9b4a54 55%, #CEB888)',
  'fsu-gold': 'linear-gradient(135deg, #CEB888, #fff1c1)',
  'fsu-spear': 'linear-gradient(140deg, #782F40 15%, #CEB888 85%)',
  'fsu-campus': 'linear-gradient(160deg, #1c2b4a, #782F40)',
  'fsu-stadium': 'linear-gradient(135deg, #0f1a30, #782F40 65%, #CEB888)',
  neon: 'linear-gradient(135deg, #2d1b69, #f72585)',
  cosmic: 'linear-gradient(135deg, #120078, #9d0191)',
  beach: 'linear-gradient(135deg, #ffb347, #ffcc33)',
  stage: 'linear-gradient(135deg, #414141, #000000)'
};

function showScreen(targetId) {
  const keyboardScreen = document.getElementById('screen-keyboard');
  if (keyboardScreen.classList.contains('active')) {
    keyboardScreen.classList.remove('active');
  }

  screenOrder.forEach((id, index) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('active', id === targetId);
    }
    if (id === targetId) {
      currentScreenIndex = index;
    }
  });

  updateProgress(targetId);

  if (targetId === 'screen-review') {
    document.getElementById('review-summary').innerHTML = generateSummaryHTML();
  }
}

function goToNextScreen() {
  const nextIndex = Math.min(currentScreenIndex + 1, screenOrder.length - 1);
  if (validateScreen(screenOrder[currentScreenIndex])) {
    if (screenOrder[currentScreenIndex] === 'screen-party') {
      stopSelfie();
    }
    showScreen(screenOrder[nextIndex]);
  }
}

function goToPreviousScreen() {
  const prevIndex = Math.max(currentScreenIndex - 1, 0);
  showScreen(screenOrder[prevIndex]);
}

function validateScreen(screenId) {
  switch (screenId) {
    case 'screen-background':
      if (!state.background) {
        alert('Please select a background to continue.');
        return false;
      }
      break;
    case 'screen-party':
      if (!state.partyName.trim()) {
        alert('Please enter a party name.');
        return false;
      }
      if (!state.peopleCount) {
        alert('Please choose how many people are in the photo.');
        return false;
      }
      break;
    case 'screen-delivery': {
      if (!state.deliveryMethod) {
        alert('Please select a delivery method.');
        return false;
      }
      const filledEmails = state.emails.filter(email => email && email.trim().length);
      if (filledEmails.length !== state.emailCount) {
        alert('Please fill in all email addresses.');
        return false;
      }
      if (filledEmails.some(email => !isValidEmail(email))) {
        alert('One or more email addresses look incorrect.');
        return false;
      }
      break;
    }
    case 'screen-payment':
      if (!state.paymentMethod) {
        alert('Please pick a payment method.');
        return false;
      }
      break;
    default:
      break;
  }
  return true;
}

async function loadConfig() {
  try {
    const res = await fetch('./config.json');
    const config = await res.json();
    window.appConfig = config;
    appConfig = config;
    init();
  } catch (error) {
    console.error('Unable to load configuration', error);
  }
}

function init() {
  if (!appConfig) return;
  setupNavigation();
  populateEventInfo();
  populateBackgrounds();
  populateTouchSelectors();
  setupCustomBackground();
  setupSelfie();
  setupKeyboard();
  document.getElementById('confirm-btn').addEventListener('click', onConfirm);
  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('finish-btn').addEventListener('click', resetKiosk);
  document.getElementById('cancel-confirm').addEventListener('click', hideConfirmModal);
  document.getElementById('continue-confirm').addEventListener('click', finalizeTransaction);
  updateProgress('screen-welcome');
}

function setupNavigation() {
  document.getElementById('start-btn').addEventListener('click', () => showScreen('screen-background'));
  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', goToNextScreen));
  document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', goToPreviousScreen));
}

function populateEventInfo() {
  const eventName = document.getElementById('event-name');
  if (eventName) {
    eventName.textContent = `${appConfig.eventName}`;
  }
  const headerName = document.getElementById('eventName');
  headerName.textContent = appConfig.eventName;
  document.getElementById('eventTagline').textContent = 'Tap to begin your photo experience';
  const priceInfo = document.getElementById('price-info');
  const headerPrice = document.getElementById('eventPrice');
  if (!appConfig.price) {
    priceInfo.textContent = 'Today only: Free photo session!';
    headerPrice.textContent = 'Free Event';
  } else {
    const formatted = formatCurrency(appConfig.price, appConfig.currency);
    priceInfo.textContent = `Package Price: ${formatted}`;
    headerPrice.textContent = `Only ${formatted}`;
  }
  const paymentNote = document.getElementById('payment-note');
  paymentNote.textContent = appConfig.price ?
    `Total due: ${formatCurrency(appConfig.price, appConfig.currency)}. Tap a method to continue.` :
    'No payment needed today. Tap a method to confirm delivery.';
}

function populateBackgrounds() {
  const template = document.getElementById('background-option-template');
  const grid = document.getElementById('background-grid');
  grid.innerHTML = '';
  appConfig.backgrounds.forEach((background, index) => {
    const option = template.content.firstElementChild.cloneNode(true);
    option.style.backgroundImage = getBackgroundImage(background);
    option.querySelector('.label').textContent = background.name;
    option.title = `Tap to choose ${background.name}`;
    option.addEventListener('click', () => selectBackground(background, option, index));
    grid.appendChild(option);
  });
}

function selectBackground(background, option, index) {
  document.querySelectorAll('.background-option').forEach(btn => btn.classList.remove('selected'));
  option.classList.add('selected');
  const backgroundImage = getBackgroundImage(background);
  state.background = { ...background, image: backgroundImage };
  state.backgroundSource = 'preset';
  state.customBackgroundData = null;
  updateBackgroundPreview(backgroundImage);
}

function updateBackgroundPreview(imageUrl) {
  const preview = document.getElementById('background-preview');
  if (imageUrl) {
    preview.style.backgroundImage = imageUrl;
    preview.textContent = '';
  } else {
    preview.style.backgroundImage = '';
    preview.textContent = 'Choose a background';
  }
}

function populateTouchSelectors() {
  createTouchSelector(
    document.getElementById('people-count'),
    buildRange(1, 8),
    value => `${value}`,
    value => {
      state.peopleCount = Number(value);
    }
  );

  createTouchSelector(
    document.getElementById('delivery-method'),
    appConfig.deliveryMethods,
    value => value,
    value => {
      state.deliveryMethod = value;
    }
  );

  const printOptions = buildRange(0, appConfig.maxPrints);
  createTouchSelector(
    document.getElementById('prints-count'),
    printOptions,
    value => `${value}`,
    value => {
      state.prints = Number(value);
    }
  );

  const emailOptions = buildRange(0, appConfig.maxEmails);
  createTouchSelector(
    document.getElementById('email-count'),
    emailOptions,
    value => `${value}`,
    value => {
      state.emailCount = Number(value);
      renderEmailInputs(state.emailCount);
    }
  );

  createTouchSelector(
    document.getElementById('payment-method'),
    appConfig.paymentMethods,
    value => value,
    value => {
      state.paymentMethod = value;
    }
  );
}

function buildRange(min, max) {
  const range = [];
  for (let i = min; i <= max; i++) {
    range.push(i);
  }
  return range;
}

function createTouchSelector(container, options, labelFormatter, onSelect) {
  const template = document.getElementById('touch-option-template');
  container.innerHTML = '';
  options.forEach(value => {
    const btn = template.content.firstElementChild.cloneNode(true);
    btn.textContent = labelFormatter(value);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.touch-option').forEach(option => option.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(value);
    });
    container.appendChild(btn);
  });
}

function setupCustomBackground() {
  const helpButton = document.getElementById('custom-background-help');
  const modal = document.getElementById('custom-background-modal');
  const modalClose = document.getElementById('modal-close');
  const fileInput = document.getElementById('custom-background-input');
  const useButton = document.getElementById('custom-background-use');
  if (!helpButton || !modal || !modalClose || !fileInput || !useButton) {
    return;
  }
  useButton.disabled = true;

  helpButton.addEventListener('click', () => modal.classList.remove('hidden'));
  modalClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.classList.add('hidden');
    }
  });

  fileInput.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) {
      useButton.disabled = true;
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      state.customBackgroundData = e.target.result;
      useButton.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  useButton.addEventListener('click', () => {
    if (!state.customBackgroundData) return;
    document.querySelectorAll('.background-option').forEach(btn => btn.classList.remove('selected'));
    state.background = {
      id: 'custom',
      name: 'Custom Background',
      image: `url(${state.customBackgroundData})`
    };
    state.backgroundSource = 'custom';
    updateBackgroundPreview(`url(${state.customBackgroundData})`);
    alert('Custom background ready!');
  });
}

function renderEmailInputs(count = state.emailCount) {
  const container = document.getElementById('emailInputs');
  container.innerHTML = '';
  state.emails = new Array(count).fill('');
  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'email-chip touch-field';
    wrapper.dataset.keyboardTarget = `email-${i}`;
    const label = document.createElement('span');
    label.textContent = `Email ${i + 1}`;
    const input = document.createElement('input');
    input.type = 'email';
    input.id = `email-${i}`;
    input.readOnly = true;
    input.autocomplete = 'off';
    input.dataset.index = i;
    input.addEventListener('focus', () => openKeyboardForInput(input));
    input.addEventListener('click', () => openKeyboardForInput(input));
    input.setAttribute('aria-label', `Email address ${i + 1}`);
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
    wrapper.addEventListener('click', () => openKeyboardForInput(input));
  }
}

function setupSelfie() {
  const startBtn = document.getElementById('selfie-start');
  const captureBtn = document.getElementById('selfie-capture');
  const retakeBtn = document.getElementById('selfie-retake');
  const video = document.getElementById('selfie-video');
  const canvas = document.getElementById('selfie-canvas');

  startBtn.addEventListener('click', async () => {
    if (selfieStream) {
      stopSelfie();
    }
    try {
      selfieStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = selfieStream;
      captureBtn.disabled = false;
      startBtn.disabled = true;
    } catch (error) {
      alert('Camera unavailable. Please ask an attendant for assistance.');
    }
  });

  captureBtn.addEventListener('click', () => {
    if (!selfieStream) return;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.classList.remove('hidden');
    video.classList.add('hidden');
    state.selfieData = canvas.toDataURL('image/png');
    captureBtn.disabled = true;
    retakeBtn.disabled = false;
  });

  retakeBtn.addEventListener('click', () => {
    if (!selfieStream) return;
    video.classList.remove('hidden');
    canvas.classList.add('hidden');
    captureBtn.disabled = false;
    retakeBtn.disabled = true;
    state.selfieData = null;
  });
}

function setupKeyboard() {
  const keyboardScreen = document.getElementById('screen-keyboard');
  const keyboardKeys = document.getElementById('keyboard-keys');
  const keyboardDone = document.getElementById('keyboard-done');
  const keyboardClear = document.getElementById('keyboard-clear');
  const keyboardDisplay = document.getElementById('keyboard-display');

  const layout = [
    '1','2','3','4','5','6','7','8','9','0',
    'Q','W','E','R','T','Y','U','I','O','P',
    'A','S','D','F','G','H','J','K','L','@',
    'Z','X','C','V','B','N','M','.','-','_',
    'Space','⌫'
  ];

  layout.forEach(char => {
    const key = document.createElement('button');
    key.type = 'button';
    key.textContent = char === 'Space' ? 'Space' : char;
    key.addEventListener('click', () => {
      if (char === '⌫') {
        keyboardValue = keyboardValue.slice(0, -1);
      } else if (char === 'Space') {
        keyboardValue += ' ';
      } else {
        keyboardValue += char;
      }
      keyboardDisplay.textContent = keyboardValue;
    });
    keyboardKeys.appendChild(key);
  });

  keyboardDone.addEventListener('click', () => {
    if (!currentKeyboardInput) return closeKeyboard();
    const value = keyboardValue.trim();
    currentKeyboardInput.value = value;
    if (currentKeyboardInput.id.startsWith('email-')) {
      const index = Number(currentKeyboardInput.dataset.index);
      state.emails[index] = value;
    } else if (currentKeyboardInput.id === 'party-name') {
      state.partyName = value;
    }
    closeKeyboard();
  });

  keyboardClear.addEventListener('click', () => {
    keyboardValue = '';
    keyboardDisplay.textContent = '';
  });

  document.querySelectorAll('[data-keyboard-target]').forEach(wrapper => {
    const input = document.getElementById(wrapper.dataset.keyboardTarget);
    input.readOnly = true;
    wrapper.addEventListener('click', () => openKeyboardForInput(input));
  });

  document.getElementById('party-name').addEventListener('focus', event => {
    event.target.blur();
    openKeyboardForInput(event.target);
  });
}

function openKeyboardForInput(input) {
  currentKeyboardInput = input;
  keyboardValue = input.value || '';
  const keyboardDisplay = document.getElementById('keyboard-display');
  keyboardDisplay.textContent = keyboardValue;
  const keyboardScreen = document.getElementById('screen-keyboard');
  keyboardScreen.classList.add('active');
}

function closeKeyboard() {
  currentKeyboardInput = null;
  const keyboardScreen = document.getElementById('screen-keyboard');
  keyboardScreen.classList.remove('active');
}

function isValidEmail(email) {
  const pattern = /.+@.+\..+/;
  return pattern.test(email);
}

function onConfirm() {
  if (!validateScreen('screen-delivery') || !validateScreen('screen-payment')) {
    return;
  }
  stopSelfie();
  const summary = document.getElementById('review-summary');
  summary.innerHTML = generateSummaryHTML();
  capturePendingReceipt();
  showConfirmModal();
}

function generateSummaryHTML() {
  const priceText = appConfig.price ? formatCurrency(appConfig.price, appConfig.currency) : 'Free';
  return `
    <h3>You're all set!</h3>
    <p><strong>Party:</strong> ${state.partyName}</p>
    <p><strong>Background:</strong> ${state.background ? state.background.name : 'Not selected'}</p>
    <p><strong>People in photo:</strong> ${state.peopleCount}</p>
    <p><strong>Delivery:</strong> ${state.deliveryMethod}</p>
    <p><strong>Prints:</strong> ${state.prints}</p>
    <p><strong>Email count:</strong> ${state.emailCount}</p>
    <p><strong>Payment:</strong> ${state.paymentMethod}</p>
    <p><strong>Total:</strong> ${priceText}</p>
  `;
}

function capturePendingReceipt() {
  const now = new Date();
  const photoID = generatePhotoID();
  const formattedDate = now.toLocaleDateString('en-US');
  const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const emailList = collectEmailAddresses();
  const priceText = appConfig.price ? formatCurrency(appConfig.price, appConfig.currency) : 'Free';

  pendingReceipt = {
    customerNumber: photoID,
    photoID,
    createdAt: now.toISOString(),
    date: formattedDate,
    time: formattedTime,
    partyName: state.partyName,
    background: state.background ? state.background.name : 'Custom Upload',
    backgroundId: state.background ? state.background.id : 'custom',
    backgroundImage: state.background ? state.background.image : state.customBackgroundData,
    deliveryMethod: state.deliveryMethod,
    prints: state.prints,
    emailCount: state.emailCount,
    emails: emailList,
    paymentMethod: state.paymentMethod,
    total: priceText,
    hotline: appConfig.hotline,
    supportEmail: appConfig.supportEmail,
    peopleCount: state.peopleCount
  };
}

function renderReceipt() {
  const receipt = document.getElementById('receipt-output');
  if (!pendingReceipt) return;
  const emails = pendingReceipt.emails.length ? pendingReceipt.emails.map(email => `<li>${email}</li>`).join('') : '<li>No emails requested</li>';

  receipt.innerHTML = `
    <section class="receipt-section">
      <h3>Customer Copy</h3>
      <p><strong>Name:</strong> ${pendingReceipt.partyName}</p>
      <p><strong>Event:</strong> ${appConfig.eventName}</p>
      <p><strong>Date:</strong> ${pendingReceipt.date}</p>
      <p><strong>Time:</strong> ${pendingReceipt.time}</p>
      <p><strong>Prints:</strong> ${pendingReceipt.prints}</p>
      <p><strong>Emails:</strong> ${pendingReceipt.emailCount}</p>
      <p><strong>Delivery:</strong> ${pendingReceipt.deliveryMethod}</p>
      <p><strong>Payment Method:</strong> ${pendingReceipt.paymentMethod}</p>
      <p><strong>Total:</strong> ${pendingReceipt.total}</p>
      <p><strong>Photo ID:</strong> ${pendingReceipt.photoID}</p>
      <div class="stamp-grid">
        <div class="stamp-area">Paid</div>
        <div class="stamp-area">Email Sent</div>
        <div class="stamp-area">Printed</div>
        <div class="stamp-area">Picked Up</div>
        <div class="stamp-area">Photo Taken</div>
      </div>
      <div class="notes-section">
        <p><strong>Notes:</strong> ____________________________</p>
      </div>
      <p class="instruction">Come back at the end of the night to pick up your prints. If you do not receive your email within 2 business days, contact ${pendingReceipt.supportEmail}. Questions? Call ${pendingReceipt.hotline}.</p>
    </section>
    <section class="receipt-section">
      <h3>Operator Copy</h3>
      <p><strong>Name:</strong> ${pendingReceipt.partyName}</p>
      <p><strong>Delivery:</strong> ${pendingReceipt.deliveryMethod}</p>
      <p><strong>Date:</strong> ${pendingReceipt.date}</p>
      <p><strong>Time:</strong> ${pendingReceipt.time}</p>
      <p><strong>People:</strong> ${pendingReceipt.peopleCount}</p>
      <p><strong>Background:</strong> ${pendingReceipt.background}</p>
      <p><strong>Background ID:</strong> ${pendingReceipt.backgroundId}</p>
      <p><strong>Emails:</strong></p>
      <ul>${emails}</ul>
      <p><strong>Email Count:</strong> ${pendingReceipt.emailCount}</p>
      <p><strong>Prints:</strong> ${pendingReceipt.prints}</p>
      <p><strong>Total:</strong> ${pendingReceipt.total}</p>
      <p><strong>Photo ID:</strong> <span class="large-photo-id">${pendingReceipt.photoID}</span></p>
      <div class="notes-section">
        <p><strong>Notes:</strong> ____________________________</p>
      </div>
      ${state.selfieData ? `<img class="selfie-thumbnail" src="${state.selfieData}" alt="Customer quick selfie" />` : ''}
    </section>
  `;
}

function resetKiosk() {
  stopSelfie();
  Object.assign(state, {
    background: null,
    backgroundSource: null,
    customBackgroundData: null,
    partyName: '',
    peopleCount: null,
    deliveryMethod: null,
    prints: 0,
    emailCount: 0,
    emails: [],
    paymentMethod: null,
    selfieData: null
  });

  document.querySelectorAll('.background-option').forEach(btn => btn.classList.remove('selected'));
  updateBackgroundPreview('');
  document.querySelectorAll('.touch-selector').forEach(selector => selector.querySelectorAll('.touch-option').forEach(btn => btn.classList.remove('selected')));
  document.getElementById('party-name').value = '';
  document.getElementById('emailInputs').innerHTML = '';
  document.getElementById('review-summary').innerHTML = '';
  document.getElementById('custom-background-input').value = '';
  document.getElementById('custom-background-use').disabled = true;
  pendingReceipt = null;
  updateProgress('screen-welcome');
  showScreen('screen-welcome');
}

function stopSelfie() {
  if (selfieStream) {
    selfieStream.getTracks().forEach(track => track.stop());
    selfieStream = null;
  }
  document.getElementById('selfie-video').classList.remove('hidden');
  document.getElementById('selfie-canvas').classList.add('hidden');
  document.getElementById('selfie-start').disabled = false;
  document.getElementById('selfie-capture').disabled = true;
  document.getElementById('selfie-retake').disabled = true;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function collectEmailAddresses() {
  const container = document.getElementById('emailInputs');
  const inputs = Array.from(container.querySelectorAll('input'));
  const addresses = inputs.map(input => input.value.trim()).filter(Boolean);
  state.emails = inputs.map(input => input.value.trim());
  return addresses;
}

function showConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  modal.classList.remove('hidden');
}

function hideConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  modal.classList.add('hidden');
}

function finalizeTransaction() {
  hideConfirmModal();
  if (!pendingReceipt) return;
  renderReceipt();
  const receiptRecord = {
    customerNumber: pendingReceipt.photoID,
    name: pendingReceipt.partyName,
    payment: pendingReceipt.paymentMethod,
    emailCount: pendingReceipt.emailCount,
    prints: pendingReceipt.prints,
    photoID: pendingReceipt.photoID,
    status: {
      paid: false,
      emailed: false,
      printed: false,
      pickedUp: false,
      photoTaken: Boolean(state.selfieData)
    },
    delivery: pendingReceipt.deliveryMethod,
    emails: pendingReceipt.emails,
    total: pendingReceipt.total,
    createdAt: pendingReceipt.createdAt,
    people: pendingReceipt.peopleCount
  };
  logTransaction(receiptRecord);
  sendEmails(pendingReceipt.emails);
  showScreen('screen-receipt');
}

function logTransaction(receipt) {
  const existing = JSON.parse(localStorage.getItem('records') || '[]');
  existing.push(receipt);
  localStorage.setItem('records', JSON.stringify(existing));

  const blob = new Blob([JSON.stringify(existing, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'records.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function sendEmails(addresses) {
  addresses.forEach(email => {
    console.log(`Email sent to ${email}`);
  });
}

function generatePhotoID() {
  return Math.floor(1000 + Math.random() * 9000);
}

function updateProgress(targetId) {
  const indicator = document.getElementById('progress-indicator');
  const index = progressScreens.indexOf(targetId);
  const totalSteps = progressScreens.length;
  if (index !== -1) {
    indicator.textContent = `Step ${index + 1} of ${totalSteps}`;
  } else if (targetId === 'screen-welcome') {
    indicator.textContent = `Step 1 of ${totalSteps}`;
  } else if (targetId === 'screen-receipt') {
    indicator.textContent = 'Receipt Ready';
  }
}

function getBackgroundImage(background) {
  const gradient = backgroundGradients[background.id];
  if (gradient) {
    return gradient;
  }
  const file = background.file || '';
  if (!file) return gradient || '';
  const imagePath = file.startsWith('http') ? file : `./assets/backgrounds/${file}`;
  return `url(${imagePath})`;
}

window.addEventListener('DOMContentLoaded', loadConfig);
