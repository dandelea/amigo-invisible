import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyLinkBox } from './copy-link-box'
import { ParticipantList } from './participant-list'
import { FormField } from './ui/form-field'
import { t } from '@/texts/es'

describe('CopyLinkBox', () => {
  it('copia el enlace y lo confirma', async () => {
    const user = userEvent.setup()
    render(<CopyLinkBox url="https://ejemplo.test/s/abc" primary />)
    await user.click(screen.getByRole('button', { name: t.copy.button }))
    expect(await navigator.clipboard.readText()).toBe(
      'https://ejemplo.test/s/abc',
    )
    expect(screen.getByText(t.copy.done)).toBeInTheDocument()
  })

  it('avisa si no se puede copiar', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('denegado'),
    )
    render(<CopyLinkBox url="https://ejemplo.test" />)
    await user.click(screen.getByRole('button', { name: t.copy.button }))
    expect(screen.getByText(t.copy.failed)).toBeInTheDocument()
  })
})

describe('FormField', () => {
  it('asocia etiqueta, ayuda y error al campo', () => {
    render(
      <FormField
        label="Tu nombre"
        hint="Así te verá el grupo."
        error="Escribe tu nombre."
        value=""
        onChange={() => {}}
      />,
    )
    const input = screen.getByLabelText('Tu nombre')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Escribe tu nombre. Así te verá el grupo.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu nombre.')
  })

  it('muestra el contador de caracteres', () => {
    render(
      <FormField
        label="Nombre"
        value="Sofía"
        maxLength={30}
        showCounter
        onChange={() => {}}
      />,
    )
    expect(screen.getByText('5/30')).toBeInTheDocument()
  })
})

describe('ParticipantList', () => {
  it('marca a la persona que mira con «Tú»', () => {
    render(
      <ParticipantList
        meId="2"
        participants={[
          { id: '1', name: 'Ana' },
          { id: '2', name: 'Marta' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent(`Marta ${t.room.you}`)
    expect(items[0]).not.toHaveTextContent(t.room.you)
  })

  it('avisa si todavía no hay nadie', () => {
    render(<ParticipantList participants={[]} />)
    expect(screen.getByText(t.room.empty)).toBeInTheDocument()
  })
})
