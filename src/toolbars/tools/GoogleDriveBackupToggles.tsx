import { GenericToggleButtonProps } from '@/components/generics/GenericToggleButton';
import GenericToggleButtonGroup from '@/components/generics/GenericToggleButtonGroup';
import { getPipelineStore, setPipelineStore } from '@/context/pipelineStore';
import {
  downloadDriveBackup,
  getGoogleDriveSession,
  isGoogleDriveConfigured,
  signInToGoogleDrive,
  signOutOfGoogleDrive,
  subscribeGoogleDriveSession,
  uploadDriveBackup,
} from '@/lib/googleDrive';
import { createPipelineBackup, parsePipelineBackup } from '@/pipeline/pipelineBackup';
import { Box, CircularProgress, Typography } from '@mui/material';
import { CloudDownload, CloudUpload, LogIn, LogOut } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

type Status = { type: 'success' | 'error'; text: string };

export default function GoogleDriveBackupToggles() {
  const { t } = useTranslation();
  const session = useSyncExternalStore(subscribeGoogleDriveSession, getGoogleDriveSession);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const configured = isGoogleDriveConfigured();

  async function runAction(action: () => Promise<string>) {
    setBusy(true);
    setStatus(null);
    try {
      setStatus({ type: 'success', text: await action() });
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : t('googleDriveFailed') });
    } finally {
      setBusy(false);
    }
  }

  const signIn = () => runAction(async () => {
    await signInToGoogleDrive();
    return t('googleDriveSignedIn');
  });

  const backup = () => runAction(async () => {
    const { pipelines } = getPipelineStore();
    await uploadDriveBackup(createPipelineBackup(pipelines));
    return t('googleDriveBackupDone', { count: pipelines.length });
  });

  const restore = () => {
    if (!window.confirm(t('googleDriveRestoreConfirm'))) return;

    return runAction(async () => {
      const pipelines = parsePipelineBackup(await downloadDriveBackup());
      setPipelineStore({ pipelines });
      return t('googleDriveRestoreDone', { count: pipelines.length });
    });
  };

  const signOut = () => {
    signOutOfGoogleDrive();
    setStatus(null);
  };

  const signInItem: GenericToggleButtonProps = {
    tooltip: configured ? t('googleDriveSignIn') : t('googleDriveNotConfigured'),
    icon: <LogIn />,
    title: t('googleDriveLabel'),
    disabled: !configured || busy,
    onClick: signIn,
  };

  const signedInItems: GenericToggleButtonProps[] = [
    {
      tooltip: t('googleDriveBackup'),
      icon: <CloudUpload />,
      title: '',
      disabled: busy,
      onClick: backup,
    },
    {
      tooltip: t('googleDriveRestore'),
      icon: <CloudDownload />,
      title: '',
      disabled: busy,
      onClick: restore,
    },
    {
      tooltip: t('googleDriveSignOut'),
      icon: <LogOut />,
      title: '',
      disabled: busy,
      onClick: signOut,
    },
  ];

  const caption = status?.text ?? session?.email;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {busy && <CircularProgress size={14} />}
      {caption && (
        <Typography
          variant="caption"
          color={status?.type === 'error' ? 'error' : 'text.secondary'}
          noWrap
          title={caption}
          sx={{ maxWidth: 220 }}
        >
          {caption}
        </Typography>
      )}
      <GenericToggleButtonGroup
        id="google-drive-toggle"
        items={session ? signedInItems : [signInItem]}
      />
    </Box>
  );
}
