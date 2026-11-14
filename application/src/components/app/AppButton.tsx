import React from 'react';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { colors } from '@/design-system/tokens';

export type AppButtonTone =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'water'
  | 'earth'
  | 'success'
  | 'warning';

const toneVariant: Record<
  AppButtonTone,
  'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
  water: 'default',
  earth: 'default',
  success: 'default',
  warning: 'default',
};

const toneClass: Partial<Record<AppButtonTone, string>> = {
  water: 'bg-water',
  earth: 'bg-earth',
  success: 'bg-success',
  warning: 'bg-warning',
};

const toneTextClass: Record<AppButtonTone, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
  water: 'text-water-foreground',
  earth: 'text-earth-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
};

export type AppButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'variant'
> & {
  tone?: AppButtonTone;
  loading?: boolean;
  children: React.ReactNode;
  textClassName?: string;
};

export function AppButton({
  tone = 'primary',
  loading = false,
  children,
  className,
  textClassName,
  isDisabled,
  ...props
}: AppButtonProps) {
  return (
    <Button
      variant={toneVariant[tone]}
      className={[toneClass[tone], className].filter(Boolean).join(' ')}
      isDisabled={isDisabled || loading}
      {...props}
    >
      {loading ? <ButtonSpinner color={colors.white} /> : null}
      <ButtonText className={[toneTextClass[tone], textClassName].filter(Boolean).join(' ')}>
        {children}
      </ButtonText>
    </Button>
  );
}

export type AppIconButtonProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: 'primary' | 'muted' | 'water' | 'earth';
};

const iconColor: Record<NonNullable<AppIconButtonProps['tone']>, string> = {
  primary: colors.primary,
  muted: colors.muted,
  water: colors.water,
  earth: colors.earth,
};

export function AppIconButton({
  icon,
  label,
  onPress,
  testID,
  tone = 'primary',
}: AppIconButtonProps) {
  const Icon = icon;
  return (
    <Button
      size="icon"
      variant="ghost"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      className="h-12 w-12 rounded-full"
    >
      <Icon size={22} color={iconColor[tone]} />
    </Button>
  );
}
