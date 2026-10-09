import HelpWindow from '@/windows/HelpWindow';
import NewVersionWindow from '@/windows/NewVersionWindow';
import OnboardingWindow from '@/windows/OnboardingWindow';
import SettingsWindow from '@/windows/SettingsWindow';
import TemplatesWindow from '@/windows/TemplatesWindow';

export default function Windows() {

  return (
    <>
      <NewVersionWindow />
      <OnboardingWindow />
      <SettingsWindow />
      <TemplatesWindow />
      <HelpWindow />
    </>
  );
}
