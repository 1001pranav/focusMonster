import { Platform } from 'react-native';
import { openAccessibilitySettings, openAppDetails } from '../../modules/usage-stats/gate';
import { Button, Card, Txt } from './components';

/**
 * Steps to turn on the accessibility service. On Android 13+ a sideloaded app's service is
 * blocked until "Allow restricted settings" is tapped, and that menu item only appears after the
 * first attempt, so the steps follow that order.
 */
export function GateSetup() {
  const restricted = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  return (
    <Card tone="primary">
      <Txt variant="heading">Finish setting up the gate</Txt>
      <Txt muted>Android asks you to turn it on yourself. FocusMonster only learns which app is opening, never what's on your screen.</Txt>
      <Txt>1. In Accessibility, open "Downloaded apps" (or "Installed services"), choose "FocusMonster mindful gate" and turn it on.</Txt>
      <Button title="Open Accessibility settings" onPress={openAccessibilitySettings} />
      {restricted && (
        <>
          <Txt>2. If Android says "Restricted setting": open App info, tap ⋮ at the top right, choose "Allow restricted settings", then do step 1 again.</Txt>
          <Button title="Open App info" kind="secondary" onPress={openAppDetails} />
        </>
      )}
    </Card>
  );
}
