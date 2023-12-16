// @ts-check

export function manageUI() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="container">
      <h2>Refreshing BlueSky account list</h2>
      <p>
        <div>
          <input class=tokenINPUT name=tokenINPUT autocomplete=on>
        </div>
        <button class=updateBUTTON>Update</button>
      </p>
      <p class=fetchingAccountsProgressPanel>
      </p>
      <p class=committingProgressPanel>
        <div>
          <button class=commitBUTTON>Commit</button>
        </div>
        <div class=comittingProgressMessagePanel>
        </div>
      </p>
    </div>
  `;

  document.body.appendChild(container);

  const handlers = {
    updateAccountsPanel,
    updateCommitPanel,
    close,
    /** @type {((token: string) => Promise<void>) | undefined} */
    onUpdateClick: undefined,
    /** @type {(() => Promise<void>) | undefined} */
    onCommitClick: undefined
  };

  var updateRunning = false;
  var commitRunning = false;

  const tokenINPUT = /** @type {HTMLInputElement} */(
    container.querySelector('.tokenINPUT'));
  const updateBUTTON = /** @type {HTMLButtonElement} */(
    container.querySelector('.updateBUTTON'));

  const fetchingAccountsProgressPanel = /** @type {HTMLElement} */(
    container.querySelector('.fetchingAccountsProgressPanel'));

  const committingProgressPanel = /** @type {HTMLElement} */(
    container.querySelector('.committingProgressPanel'));
  committingProgressPanel.style.display = 'none';
  const comittingProgressMessagePanel = /** @type {HTMLElement} */(
    container.querySelector('.comittingProgressMessagePanel'));

  const commitBUTTON = /** @type {HTMLButtonElement} */(
    container.querySelector('.commitBUTTON'));
  commitBUTTON.disabled = true;

  updateBUTTON.onclick = async () => {
    if (updateRunning) return;
    updateRunning = true;
    updateBUTTON.disabled = true;
    tokenINPUT.disabled = true;
    committingProgressPanel.style.display = '';
    if (!commitRunning) commitBUTTON.disabled = false;

    try {
      await handlers.onUpdateClick?.(tokenINPUT.value);
    } catch (error) {
      console.log(error);
      alert(error.message);
    } finally {
      updateBUTTON.disabled = false;
      tokenINPUT.disabled = false;
    }
  };

  commitBUTTON.onclick = async () => {
    commitBUTTON.disabled = true;
    try {
      await handlers.onCommitClick?.();
    } catch (error) {
      console.log(error);
      alert(error.message);
    } finally {
      commitBUTTON.disabled = false;
    }
  };

  return handlers;

  function close() {
    if (container.parentElement) {
      container.remove();
    }
  }

  function updateAccountsPanel(message) {
    fetchingAccountsProgressPanel.textContent = message;
  }

  function updateCommitPanel(message) {
    comittingProgressMessagePanel.textContent = message;
  }

}