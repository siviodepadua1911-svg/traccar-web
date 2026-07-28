\set ON_ERROR_STOP on
BEGIN;

-- Backups (uma vez) para poder reverter se preciso
CREATE TABLE IF NOT EXISTS ls_bak_user_notification AS SELECT * FROM tc_user_notification;
CREATE TABLE IF NOT EXISTS ls_bak_device_notification AS SELECT * FROM tc_device_notification;
CREATE TABLE IF NOT EXISTS ls_bak_user_command AS SELECT * FROM tc_user_command;
CREATE TABLE IF NOT EXISTS ls_bak_notifications AS SELECT * FROM tc_notifications;

-- 1) Remover VINCULOS duplicados exatos (mantem 1 por par)
DELETE FROM tc_user_notification a USING tc_user_notification b
  WHERE a.ctid > b.ctid AND a.userid = b.userid AND a.notificationid = b.notificationid;
DELETE FROM tc_device_notification a USING tc_device_notification b
  WHERE a.ctid > b.ctid AND a.deviceid = b.deviceid AND a.notificationid = b.notificationid;
DELETE FROM tc_user_command a USING tc_user_command b
  WHERE a.ctid > b.ctid AND a.userid = b.userid AND a.commandid = b.commandid;
DELETE FROM tc_device_command a USING tc_device_command b
  WHERE a.ctid > b.ctid AND a.deviceid = b.deviceid AND a.commandid = b.commandid;
DELETE FROM tc_user_device a USING tc_user_device b
  WHERE a.ctid > b.ctid AND a.userid = b.userid AND a.deviceid = b.deviceid;

-- 2) Remover notificacoes antigas redundantes do user 4 (14,15,16 = powerCut/lowBattery/inactive
--    somente 'web', substituidas pelas 23,24,25 que ja estao no user 4 com mais canais)
DELETE FROM tc_user_notification WHERE notificationid IN (14, 15, 16);
DELETE FROM tc_device_notification WHERE notificationid IN (14, 15, 16);
DELETE FROM tc_notifications WHERE id IN (14, 15, 16);

-- 3) Trava de unicidade (impede novas duplicatas) - restaura o comportamento padrao do Traccar
CREATE UNIQUE INDEX IF NOT EXISTS ls_uix_user_notification ON tc_user_notification (userid, notificationid);
CREATE UNIQUE INDEX IF NOT EXISTS ls_uix_device_notification ON tc_device_notification (deviceid, notificationid);
CREATE UNIQUE INDEX IF NOT EXISTS ls_uix_user_command ON tc_user_command (userid, commandid);
CREATE UNIQUE INDEX IF NOT EXISTS ls_uix_device_command ON tc_device_command (deviceid, commandid);
CREATE UNIQUE INDEX IF NOT EXISTS ls_uix_user_device ON tc_user_device (userid, deviceid);

COMMIT;
