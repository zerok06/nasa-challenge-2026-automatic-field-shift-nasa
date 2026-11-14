import React from 'react';

import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { colors } from '@/design-system/tokens';

type InputFieldProps = React.ComponentProps<typeof InputField>;

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  testID,
  required = false,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  testID?: string;
  required?: boolean;
  keyboardType?: InputFieldProps['keyboardType'];
  autoCapitalize?: InputFieldProps['autoCapitalize'];
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired={required} className="gap-1.5">
      <FormControlLabel>
        <FormControlLabelText className="text-sm font-medium text-foreground">
          {label}
        </FormControlLabelText>
      </FormControlLabel>
      <Input className="h-12 border-border bg-background">
        <InputField
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
          className={multiline ? 'min-h-24 py-2 text-base text-foreground' : 'text-base text-foreground'}
        />
      </Input>
      {error ? (
        <FormControlError>
          <FormControlErrorText className="text-destructive">{error}</FormControlErrorText>
        </FormControlError>
      ) : helper ? (
        <FormControlHelper>
          <FormControlHelperText className="text-muted-foreground">{helper}</FormControlHelperText>
        </FormControlHelper>
      ) : null}
    </FormControl>
  );
}
