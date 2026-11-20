import type { ComponentProps } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Spacing } from '@/constants/Theme';

// Contenedor de todos los formularios: al tocar un campo, la pantalla se
// desliza junto con el teclado (misma curva y duración) hasta dejar el campo
// a la vista, encima del teclado; al cerrarlo, todo regresa a su lugar.
// Con texto de varias líneas sigue al cursor mientras escribes.
export function FormularioConTeclado({
  bottomOffset = Spacing.xl,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: ComponentProps<typeof KeyboardAwareScrollView>) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  );
}
