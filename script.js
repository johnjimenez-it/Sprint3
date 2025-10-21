import { kioskConfig } from './config.js';

const screenOrder = [
  'screen-welcome',
  'screen-background',
  'screen-custom-background',
  'screen-party',
  'screen-delivery',
  'screen-payment',
  'screen-review',
  'screen-receipt'
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

function init() {
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
}

function setupNavigation() {
  document.getElementById('start-btn').addEventListener('click', () => showScreen('screen-background'));
  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', goToNextScreen));
  document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', goToPreviousScreen));
}

function populateEventInfo() {
  document.getElementById('event-name').textContent = kioskConfig.backgroundTheme + ' — ' + kioskConfig.eventName;
  const priceInfo = document.getElementById('price-info');
  if (!kioskConfig.price) {
    priceInfo.textContent = 'Today only: Free photo session!';
  } else {
    priceInfo.textContent = `Package Price: ${formatCurrency(kioskConfig.price, kioskConfig.currency)}`;
  }
  const paymentNote = document.getElementById('payment-note');
  paymentNote.textContent = kioskConfig.price ?
    `Total due: ${formatCurrency(kioskConfig.price, kioskConfig.currency)}. Tap a method to continue.` :
    'No payment needed today. Tap a method to confirm delivery.';
}

function populateBackgrounds() {
  const template = document.getElementById('background-option-template');
  const grid = document.getElementById('background-grid');
  kioskConfig.backgrounds.forEach((background, index) => {
    const option = template.content.firstElementChild.cloneNode(true);
    option.style.backgroundImage = `url(${background.image})`;
    option.querySelector('.label').textContent = background.name;
    option.addEventListener('click', () => selectBackground(background, option, index));
    grid.appendChild(option);
  });
}

function selectBackground(background, option, index) {
  document.querySelectorAll('.background-option').forEach(btn => btn.classList.remove('selected'));
  option.classList.add('selected');
  state.background = background;
  state.backgroundSource = 'preset';
  state.customBackgroundData = null;
  updateBackgroundPreview(background.image);
}

function updateBackgroundPreview(imageUrl) {
  const preview = document.getElementById('background-preview');
  preview.style.backgroundImage = `url(${imageUrl})`;
  preview.textContent = '';
}

function populateTouchSelectors() {
  createTouchSelector(
    document.getElementById('people-count'),
    kioskConfig.numberOfPeopleOptions,
    value => `${value}`,
    value => {
      state.peopleCount = Number(value);
    }
  );

  createTouchSelector(
    document.getElementById('delivery-method'),
    kioskConfig.deliveryMethods,
    value => value,
    value => {
      state.deliveryMethod = value;
    }
  );

  const printOptions = buildRange(0, kioskConfig.maxPrints);
  createTouchSelector(
    document.getElementById('prints-count'),
    printOptions,
    value => `${value}`,
    value => {
      state.prints = Number(value);
    }
  );

  const emailOptions = buildRange(0, kioskConfig.maxEmails);
  createTouchSelector(
    document.getElementById('email-count'),
    emailOptions,
    value => `${value}`,
    value => {
      state.emailCount = Number(value);
      renderEmailInputs();
    }
  );

  createTouchSelector(
    document.getElementById('payment-method'),
    kioskConfig.paymentMethods,
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
      image: state.customBackgroundData
    };
    state.backgroundSource = 'custom';
    updateBackgroundPreview(state.customBackgroundData);
    alert('Custom background ready!');
  });
}

function renderEmailInputs() {
  const container = document.getElementById('email-entry-container');
  container.innerHTML = '';
  state.emails = [];
  for (let i = 0; i < state.emailCount; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'email-chip touch-field';
    wrapper.dataset.keyboardTarget = `email-${i}`;
    const label = document.createElement('span');
    label.textContent = `Email ${i + 1}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `email-${i}`;
    input.readOnly = true;
    input.autocomplete = 'off';
    input.dataset.index = i;
    input.addEventListener('focus', () => openKeyboardForInput(input));
    input.addEventListener('click', () => openKeyboardForInput(input));
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
  renderReceipt();
  showScreen('screen-receipt');
}

function generateSummaryHTML() {
  const priceText = kioskConfig.price ? formatCurrency(kioskConfig.price, kioskConfig.currency) : 'Free';
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

function renderReceipt() {
  const receipt = document.getElementById('receipt-output');
  const now = new Date();
  const customerNumber = nextCustomerNumber();
  const formattedDate = now.toLocaleDateString('en-US');
  const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const emailList = state.emails.filter(email => email && email.length);
  const emails = emailList.length ? emailList.map(email => `<li>${email}</li>`).join('') : '<li>No emails requested</li>';
  const priceText = kioskConfig.price ? formatCurrency(kioskConfig.price, kioskConfig.currency) : 'Free';

  receipt.innerHTML = `
    <section class="receipt-section">
      <h3>Customer Copy</h3>
      <p><strong>Name:</strong> ${state.partyName}</p>
      <p><strong>Event:</strong> ${kioskConfig.backgroundTheme} — ${kioskConfig.eventName}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Prints:</strong> ${state.prints}</p>
      <p><strong>Emails:</strong> ${state.emailCount}</p>
      <p><strong>Delivery:</strong> ${state.deliveryMethod}</p>
      <p><strong>Payment Method:</strong> ${state.paymentMethod}</p>
      <p><strong>Total:</strong> ${priceText}</p>
      <p><strong>Customer #:</strong> ${customerNumber}</p>
      <div class="stamp-grid">
        <div class="stamp-area">Paid</div>
        <div class="stamp-area">Email Sent</div>
        <div class="stamp-area">Printed</div>
        <div class="stamp-area">Picked Up</div>
        <div class="stamp-area">Photo Taken</div>
      </div>
      <p class="instruction">Come back at the end of the night to pick up your prints. If you do not receive your email within 2 business days, contact ${kioskConfig.supportEmail}. Questions? Call ${kioskConfig.hotline}.</p>
    </section>
    <section class="receipt-section">
      <h3>Operator Copy</h3>
      <p><strong>Name:</strong> ${state.partyName}</p>
      <p><strong>Delivery:</strong> ${state.deliveryMethod}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>People:</strong> ${state.peopleCount}</p>
      <p><strong>Background:</strong> ${state.background ? state.background.name : 'Custom Upload'}</p>
      <p><strong>Background ID:</strong> ${state.background ? state.background.id : 'custom'}</p>
      <p><strong>Emails:</strong></p>
      <ul>${emails}</ul>
      <p><strong>Email Count:</strong> ${state.emailCount}</p>
      <p><strong>Prints:</strong> ${state.prints}</p>
      <p><strong>Total:</strong> ${priceText}</p>
      <p><strong>Notes:</strong> _________________________________</p>
      ${state.selfieData ? `<img class="selfie-thumbnail" src="${state.selfieData}" alt="Customer quick selfie" />` : ''}
      <div class="large-number">${customerNumber}</div>
    </section>
  `;
}

function nextCustomerNumber() {
  const key = 'greenscreen-customer-number';
  const current = Number(localStorage.getItem(key) || '1000') + 1;
  localStorage.setItem(key, current);
  return current;
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
  document.getElementById('background-preview').style.backgroundImage = '';
  document.getElementById('background-preview').textContent = 'Choose a background';
  document.querySelectorAll('.touch-selector').forEach(selector => selector.querySelectorAll('.touch-option').forEach(btn => btn.classList.remove('selected')));
  document.getElementById('party-name').value = '';
  document.getElementById('email-entry-container').innerHTML = '';
  document.getElementById('review-summary').innerHTML = '';
  document.getElementById('custom-background-input').value = '';
  document.getElementById('custom-background-use').disabled = true;
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

window.addEventListener('load', init);
