// Guest Pass Link Functionality
const PASS_SESSION_KEY = 'guestPassSession';
let currentLinkMode = 'pin';

document.addEventListener('DOMContentLoaded', function() {
  loadPassSession();
  
  // Enter key handler for PIN input
  document.getElementById('passReferenceInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      linkGuestPass();
    }
  });
  
  // Enter key handler for Name input
  document.getElementById('guestNameInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      requestPassLink();
    }
  });
});

function loadPassSession() {
  const session = localStorage.getItem(PASS_SESSION_KEY);
  if (session) {
    try {
      const data = JSON.parse(session);
      if (data.guest) {
        showLinkedState(data.guest);
        window.dispatchEvent(new CustomEvent('passLinked', { detail: data.guest }));
        return;
      }
    } catch (e) {
      console.error('Invalid session data');
    }
  }
  showUnlinkedState();
}

// Switch between PIN and Name modes
function switchLinkMode(mode) {
  currentLinkMode = mode;
  
  const pinBtn = document.getElementById('pinModeBtn');
  const nameBtn = document.getElementById('nameModeBtn');
  const pinModeInfo = document.getElementById('pinModeInfo');
  const nameModeInfo = document.getElementById('nameModeInfo');
  const pinInputContainer = document.getElementById('pinInputContainer');
  const nameInputContainer = document.getElementById('nameInputContainer');
  
  if (mode === 'pin') {
    // Update button styles
    pinBtn.classList.add('active');
    nameBtn.classList.remove('active');
    
    // Show/hide info panels
    if (pinModeInfo) pinModeInfo.classList.remove('hidden');
    if (nameModeInfo) nameModeInfo.classList.add('hidden');
    
    // Show/hide input containers
    if (pinInputContainer) pinInputContainer.classList.remove('hidden');
    if (nameInputContainer) nameInputContainer.classList.add('hidden');
    
    // Clear PIN input
    const pinInput = document.getElementById('passReferenceInput');
    if (pinInput) pinInput.value = '';
  } else {
    // Update button styles
    pinBtn.classList.remove('active');
    nameBtn.classList.add('active');
    
    // Show/hide info panels
    if (pinModeInfo) pinModeInfo.classList.add('hidden');
    if (nameModeInfo) nameModeInfo.classList.remove('hidden');
    
    // Show/hide input containers
    if (pinInputContainer) pinInputContainer.classList.add('hidden');
    if (nameInputContainer) nameInputContainer.classList.remove('hidden');
    
    // Clear name input
    const nameInput = document.getElementById('guestNameInput');
    if (nameInput) nameInput.value = '';
  }
  
  hideError();
  hideSuccess();
}

// Link pass with PIN
async function linkGuestPass() {
  const input = document.getElementById('passReferenceInput');
  const button = document.getElementById('linkPassButton');
  const guestPin = input.value.trim();
  
  if (!guestPin) {
    showError('Please enter your 6-digit PIN');
    return;
  }
  
  if (guestPin.length !== 6 || !/^[0-9]{6}$/.test(guestPin)) {
    showError('PIN must be exactly 6 digits');
    return;
  }
  
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Linking...';
  button.disabled = true;
  hideError();
  
  try {
    const propertyId = getPropertyId();
    const response = await fetch('/api/guest/link-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Property-ID': propertyId
      },
      body: JSON.stringify({ guest_pin: guestPin })
    });
    
    const data = await response.json();
    
    if (data.success && data.guest) {
      localStorage.setItem(PASS_SESSION_KEY, JSON.stringify({
        guest: data.guest,
        timestamp: Date.now()
      }));
      
      showLinkedState(data.guest);
      
      if (typeof confetti !== 'undefined') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 }
        });
      }
      
      window.dispatchEvent(new CustomEvent('passLinked', { detail: data.guest }));
    } else {
      showError(data.error || 'Invalid PIN. Please check and try again.');
    }
  } catch (error) {
    console.error('Link pass error:', error);
    showError('Connection error. Please try again.');
  } finally {
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
}

// Request pass link by name
async function requestPassLink() {
  const input = document.getElementById('guestNameInput');
  const button = document.getElementById('requestLinkButton');
  const guestName = input.value.trim();
  
  if (!guestName) {
    showError('Please enter your full name');
    return;
  }
  
  if (guestName.length < 3) {
    showError('Please enter your complete name');
    return;
  }
  
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
  button.disabled = true;
  hideError();
  hideSuccess();
  
  try {
    const propertyId = getPropertyId();
    const response = await fetch('/api/guest/request-pass-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Property-ID': propertyId
      },
      body: JSON.stringify({
        guest_name: guestName,
        page_url: window.location.href
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccess('✅ Request sent! Front desk will link your pass shortly.');
      input.value = '';
    } else {
      showError(data.error || 'Failed to send request. Please try again.');
    }
  } catch (error) {
    console.error('Request error:', error);
    showError('Connection error. Please try again.');
  } finally {
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
}

function showLinkedState(guest) {
  document.getElementById('passLinkBarUnlinked').classList.add('hidden');
  document.getElementById('passLinkBarLinked').classList.remove('hidden');
  document.getElementById('linkedGuestName').textContent = guest.full_name || 'Guest';
  document.getElementById('linkedRoomNumber').textContent = guest.room_number || '—';
  
  const digitalPassLink = `/guest-pass/${guest.pass_reference}`;
  document.getElementById('viewPassButton').href = digitalPassLink;
}

function showUnlinkedState() {
  document.getElementById('passLinkBarUnlinked').classList.remove('hidden');
  document.getElementById('passLinkBarLinked').classList.add('hidden');
}

function unlinkGuestPass() {
  if (confirm('Are you sure you want to unlink your pass?')) {
    localStorage.removeItem(PASS_SESSION_KEY);
    showUnlinkedState();
    window.dispatchEvent(new Event('passUnlinked'));
    document.getElementById('passReferenceInput').value = '';
  }
}

function togglePassInfo() {
  document.getElementById('passInfoPanel').classList.toggle('hidden');
}

function showError(message) {
  document.getElementById('passLinkErrorMessage').textContent = message;
  document.getElementById('passLinkError').classList.remove('hidden');
  setTimeout(() => {
    hideError();
  }, 5000);
}

function hideError() {
  document.getElementById('passLinkError').classList.add('hidden');
}

function showSuccess(message) {
  document.getElementById('passLinkSuccessMessage').textContent = message;
  document.getElementById('passLinkSuccess').classList.remove('hidden');
  setTimeout(() => {
    hideSuccess();
  }, 8000);
}

function hideSuccess() {
  document.getElementById('passLinkSuccess').classList.add('hidden');
}

function getPropertyId() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyParam = urlParams.get('property');
  if (propertyParam) return propertyParam;
  
  const stored = localStorage.getItem('property_id');
  if (stored) return stored;
  
  return '1';
}

function goToMyWeek() {
  const propertyId = getPropertyId();
  window.location.href = '/my-perfect-week?property=' + propertyId;
}

function goToMyBookings() {
  const propertyId = getPropertyId();
  window.location.href = '/my-bookings?property=' + propertyId;
}

function getGuestSession() {
  const session = localStorage.getItem(PASS_SESSION_KEY);
  if (session) {
    try {
      const data = JSON.parse(session);
      if (data.guest) {
        return data.guest;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Expose functions to window
window.getGuestSession = getGuestSession;
window.switchLinkMode = switchLinkMode;
window.requestPassLink = requestPassLink;
window.linkGuestPass = linkGuestPass;
window.unlinkGuestPass = unlinkGuestPass;
window.togglePassInfo = togglePassInfo;
window.goToMyWeek = goToMyWeek;
window.goToMyBookings = goToMyBookings;
