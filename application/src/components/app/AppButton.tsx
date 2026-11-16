import React from 'react';
import { useColorScheme } from 'react-native';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { colors, darkColors } from '@/design-system/tokens';

/**
 * Button hierarchy:
 * - primary: the one main action on a screen.
 * - secondary: a tonal alternative that does not compete with primary.
 * - outline: a tertiary action with a visible boundary.
 * - ghost: cancel, back or low-emphasis navigation.
 * - destructive: irreversible actions only.
 * - water / earth / success / warning: contextual secondary tones.
 *
 * Only primary and destructive use a solid fill. Context tones stay soft so
 * the farmer can always identify the main next step.
 */
export type AppButtonTone =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'water'
  | 'earth'
  | 'success'
  | 'warning'
  | 'surface';

const toneVariant: Record<
  AppButtonTone,
  'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
> = {
  primary: 'default',
  secondary: 'ghost',
  outline: 'outline',
  ghost: 'ghost',
  destructive: 'destructive',
  water: 'ghost',
  earth: 'ghost',
  success: 'ghost',
  warning: 'ghost',
  surface: 'ghost',
};

const toneClass: Partial<Record<AppButtonTone, string>> = {
  secondary: 'bg-accent',
  water: 'bg-water/10',
  earth: 'bg-earth/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  surface: 'border border-border bg-card',
  outline: 'bg-transparent px-4',
  ghost: 'bg-transparent px-2',
};

const toneShadow: Partial<Record<AppButtonTone, string>> = {
  primary: 'shadow-sm',
  destructive: 'shadow-sm',
  surface: 'shadow-sm',
};

const toneTextClass: Record<AppButtonTone, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-primary',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
  water: 'text-water',
  earth: 'text-earth',
  success: 'text-success',
  warning: 'text-warning',
  surface: 'text-primary',
};

function spinnerColor(tone: AppButtonTone): string {
  if (tone === 'primary' || tone === 'destructive') return colors.white;
  if (tone === 'surface' || tone === 'secondary') return colors.primary;
  return colors.primary;
}

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
  const scheme = useColorScheme();
  const surfaceStyle =
    tone === 'surface'
      ? { backgroundColor: scheme === 'dark' ? darkColors.surface : colors.surface }
      : undefined;

  return (
    <Button
      variant={toneVariant[tone]}
      style={surfaceStyle}
      className={[
        'min-h-12 rounded-full px-5',
        toneShadow[tone],
        toneClass[tone],
        isDisabled || loading ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      isDisabled={isDisabled || loading}
      {...props}
    >
      {loading ? <ButtonSpinner color={spinnerColor(tone)} /> : null}
      <ButtonText
        className={['text-sm font-semibold', toneTextClass[tone], textClassName]
          .filter(Boolean)
          .join(' ')}
      >
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
