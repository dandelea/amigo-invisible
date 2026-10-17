import { render, screen } from '@testing-library/react'
import App from './App'
import { t } from '@/texts/es'

describe('App', () => {
  it('muestra el inicio con los tres pasos', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: t.appName }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(
      screen.getByRole('button', { name: t.home.createRoom }),
    ).toBeInTheDocument()
  })
})
