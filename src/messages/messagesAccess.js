import { useSelector } from 'react-redux';

// Key of this tab in the "lsMenu" user attribute: the list of top menu items
// ticked for a client in Clientes > (cliente) > Acesso.
export const MESSAGES_MENU_KEY = 'msg';

// Who sees the Messages tab:
// - administrators and managers (the LS team) always do;
// - nobody with "Desabilitar relatórios", because the server refuses the same
//   requests in that case;
// - a client only when "Mensagens" is ticked in their menu options, that is,
//   when lsMenu contains "msg". The tab shows everything the tracker sent, so
//   it is not given to clients by default;
// - the boolean attribute "ui.disableMessages", on the server or on a user,
//   hides it from everyone who is not an administrator.
export const useMessagesDisabled = () =>
  useSelector((state) => {
    const { server, user } = state.session;
    if (!server || !user) {
      return true;
    }
    if (user.administrator) {
      return false;
    }
    if (server.disableReports || user.disableReports) {
      return true;
    }
    const key = 'ui.disableMessages';
    if (user.attributes?.[key] || server.attributes?.[key]) {
      return true;
    }
    const manager = (user.userLimit || 0) !== 0;
    if (manager) {
      return false;
    }
    return !String(user.attributes?.lsMenu || '')
      .split(',')
      .includes(MESSAGES_MENU_KEY);
  });

export default useMessagesDisabled;
