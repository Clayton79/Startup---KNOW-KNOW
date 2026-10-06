import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './form-field';
import { Input } from './input';

describe('FormField', () => {
  it('liga rótulo e erro ao campo de forma acessível', () => {
    render(
      <FormField label="E-mail" error="Informe um e-mail válido." required>
        {(control) => <Input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/E-mail/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe um e-mail válido.');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
  });

  it('mostra a dica quando não há erro', () => {
    render(
      <FormField label="Cidade" hint="Usamos para aulas presenciais.">
        {(control) => <Input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText('Cidade')).toHaveAccessibleDescription(
      'Usamos para aulas presenciais.',
    );
  });
});
