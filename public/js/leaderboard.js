/** Fills the leaderboard table and the signed-in player's recent runs. */
(function () {
  const boardBody = document.getElementById('boardBody');
  const historyBody = document.getElementById('historyBody');

  function empty(tbody, text) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${text}</td></tr>`;
  }

  function formatDate(value) {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
      + ' · '
      + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /* ------------------------------ leaderboard ----------------------------- */
  API.leaderboard()
    .then(({ leaderboard }) => {
      if (!leaderboard.length) {
        return empty(boardBody, 'No races yet. Be the first name on the board.');
      }

      const me = (API.getUser() || {}).username;

      boardBody.innerHTML = leaderboard
        .map((row, i) => `
          <tr class="rank-${i + 1}">
            <td class="rank">${i + 1}</td>
            <td>${escapeHtml(row.username)}${row.username === me ? ' <small style="color:var(--mint)">you</small>' : ''}</td>
            <td class="num">${row.score}</td>
            <td class="num">${row.coins}</td>
            <td class="num">${row.games}</td>
          </tr>`)
        .join('');
    })
    .catch((err) => empty(boardBody, err.message));

  /* -------------------------------- history ------------------------------- */
  if (!API.getToken()) {
    empty(historyBody, 'Sign in to see your own race history.');
  } else {
    API.history()
      .then(({ history }) => {
        if (!history.length) {
          return empty(historyBody, 'No runs recorded yet.');
        }
        historyBody.innerHTML = history
          .map((r) => `
            <tr>
              <td>${formatDate(r.played_at)}</td>
              <td class="num">${r.score}</td>
              <td class="num">${r.coins}</td>
              <td class="num">${r.distance_m}</td>
              <td class="num">${r.top_speed}</td>
            </tr>`)
          .join('');
      })
      .catch((err) => empty(historyBody, err.message));
  }

  /** Never inject raw user input into innerHTML. */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
})();
