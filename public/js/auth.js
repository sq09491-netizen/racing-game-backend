/** Login / register page behaviour. */
(function () {
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');

  // Already signed in? Skip straight to the game.
  if (API.getToken()) window.location.href = 'game.html';

  function showError(text) {
    successBox.classList.remove('is-visible');
    errorBox.textContent = text;
    errorBox.classList.add('is-visible');
  }

  function showSuccess(text) {
    errorBox.classList.remove('is-visible');
    successBox.textContent = text;
    successBox.classList.add('is-visible');
  }

  function clearMessages() {
    errorBox.classList.remove('is-visible');
    successBox.classList.remove('is-visible');
  }

  function switchTo(view) {
    clearMessages();
    const isLogin = view === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    tabLogin.classList.toggle('is-active', isLogin);
    tabRegister.classList.toggle('is-active', !isLogin);
  }

  tabLogin.addEventListener('click', () => switchTo('login'));
  tabRegister.addEventListener('click', () => switchTo('register'));

  /* -------------------------------- sign in -------------------------------- */
  document.getElementById('loginBtn').addEventListener('click', async () => {
    clearMessages();
    const identifier = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPass').value;

    if (!identifier || !password) {
      return showError('Enter your username and password.');
    }

    try {
      const data = await API.login({ identifier, password });
      API.setSession(data.token, data.user);
      window.location.href = 'game.html';
    } catch (err) {
      showError(err.message);
    }
  });

  /* ------------------------------- register -------------------------------- */
  document.getElementById('registerBtn').addEventListener('click', async () => {
    clearMessages();
    const username = document.getElementById('regUser').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;

    if (!username || !email || !password) {
      return showError('Fill in all three fields.');
    }
    if (password.length < 6) {
      return showError('Password must be at least 6 characters.');
    }

    try {
      const data = await API.register({ username, email, password });
      API.setSession(data.token, data.user);
      showSuccess('Profile created. Loading the track…');
      setTimeout(() => (window.location.href = 'game.html'), 600);
    } catch (err) {
      showError(err.message);
    }
  });

  // Enter key submits whichever form is open.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const btn = loginForm.hidden ? 'registerBtn' : 'loginBtn';
    document.getElementById(btn).click();
  });
})();
