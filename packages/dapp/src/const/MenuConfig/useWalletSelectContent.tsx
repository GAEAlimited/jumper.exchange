import { supportedWallets, Wallet } from '@lifi/wallet-management';
import { Avatar } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserTracking } from '../../hooks';
import { useWallet } from '../../providers/WalletProvider';
import { useMenuStore, useSettingsStore } from '../../stores';
import { EventTrackingTools, MenuListItem } from '../../types';
import { TrackingActions, TrackingCategories } from '../trackingKeys';
import { useMultisig } from '../../hooks/useMultisig';

export const useWalletSelectContent = () => {
  const [, setShowWalletIdentityPopover] = useState<Wallet>();
  const { connect } = useWallet();
  const { trackEvent } = useUserTracking();
  const [isCurrentMultisigEnvironment, setIsCurrentMultisigEnvironment] =
    useState(false);

  const { checkMultisigEnvironment } = useMultisig();

  const verifyMultisigEnvironment = async () => {
    const isMultisig = await checkMultisigEnvironment();

    if (isMultisig) {
      setIsCurrentMultisigEnvironment(true);
    } else {
      setIsCurrentMultisigEnvironment(false);
    }
  };

  const onWalletConnect = useSettingsStore((state) => state.onWalletConnect);
  const [onWelcomeScreenEntered] = useSettingsStore((state) => [
    state.onWelcomeScreenEntered,
  ]);
  const onCloseAllNavbarMenus = useMenuStore(
    (state) => state.onCloseAllNavbarMenus,
  );
  const { account } = useWallet();

  const login = useCallback(
    async (wallet: Wallet) => {
      if (!wallet.installed()) {
        setShowWalletIdentityPopover(wallet);
        return;
      }
      await connect(wallet);
      onWalletConnect(wallet.name);
      try {
      } catch (e) {}
    },
    [connect, onWalletConnect],
  );

  useEffect(() => {
    verifyMultisigEnvironment();
  }, [account?.address]);

  const walletMenuItems = useMemo<MenuListItem[]>(() => {
    const installedWallets = supportedWallets.filter(async (wallet) => {
      const response = await wallet.installed();
      console.log({
        wallet: wallet.name,
        installed: wallet.installed(),
        response,
      });
      return wallet.installed();
    });

    const notInstalledWallets = supportedWallets.filter(
      (wallet) => !wallet.installed() && wallet.name !== 'Default Wallet', // always remove Default Wallet from not installed Wallets
    );

    const walletsOptions: Wallet[] = [
      ...installedWallets,
      ...notInstalledWallets,
    ].filter((wallet) => {
      if (!isCurrentMultisigEnvironment) {
        return wallet.name !== 'Safe';
      }
      return true;
    });

    const _output = walletsOptions.map((wallet) => {
      return {
        label: wallet.name,
        prefixIcon: (
          <Avatar
            src={wallet.icon}
            alt={`${wallet.name}-wallet-logo`}
            sx={{ height: '32px', width: '32px' }}
          />
        ),
        showMoreIcon: false,
        onClick: () => {
          login(wallet);
          onCloseAllNavbarMenus();
          onWelcomeScreenEntered(true);
          trackEvent({
            category: TrackingCategories.Wallet,
            action: TrackingActions.ChooseWallet,
            label: `choose-wallet-${wallet}`,
            data: { usedWallet: wallet.name },
            disableTrackingTool: [EventTrackingTools.arcx],
          });
        },
      };
    });
    return _output;
  }, [
    isCurrentMultisigEnvironment,
    login,
    onCloseAllNavbarMenus,
    onWelcomeScreenEntered,
    trackEvent,
  ]);

  return walletMenuItems;
};
