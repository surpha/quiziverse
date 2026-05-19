import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuestionCard from './QuestionCard'
import { verifyAnswer } from '../utils/llmJudge'

vi.mock('../utils/llmJudge', () => ({
  verifyAnswer: vi.fn(),
  isLLMConfigured: vi.fn(() => true),
}))

const baseQuestion = {
  question: 'Which planet is known as the Red Planet?',
  answer: 'Mars',
  type: 'straight',
  difficulty: 3,
  weights: {
    technology: 1,
    history: 1,
    geography: 1,
    science: 8,
    literature: 1,
    arts: 1,
    music: 1,
    society: 1,
    religion: 1,
    popCulture: 1,
    sports: 1,
    lifestyle: 1,
    business: 1,
  },
}

function renderQuestionCard() {
  return render(
    <QuestionCard
      question={baseQuestion}
      onClose={vi.fn()}
      onNext={vi.fn()}
      isPlayMode
    />,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('QuestionCard submit parity', () => {
  it('submits on Enter with the same trimmed payload used by Submit click', async () => {
    const verifyAnswerMock = vi.mocked(verifyAnswer)
    verifyAnswerMock.mockResolvedValue({ verdict: 'correct', explanation: 'Correct' })

    const first = renderQuestionCard()
    const enterInput = screen.getByPlaceholderText('Type your answer...')
    fireEvent.change(enterInput, { target: { value: '  Mars  ' } })
    fireEvent.keyDown(enterInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(verifyAnswerMock).toHaveBeenCalledTimes(1)
    })
    expect(verifyAnswerMock).toHaveBeenLastCalledWith(
      baseQuestion.question,
      baseQuestion.answer,
      'Mars',
    )

    first.unmount()
    verifyAnswerMock.mockClear()

    renderQuestionCard()
    const clickInput = screen.getByPlaceholderText('Type your answer...')
    fireEvent.change(clickInput, { target: { value: '  Mars  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(verifyAnswerMock).toHaveBeenCalledTimes(1)
    })
    expect(verifyAnswerMock).toHaveBeenLastCalledWith(
      baseQuestion.question,
      baseQuestion.answer,
      'Mars',
    )
  })

  it('does not submit on Enter when answer is empty, matching disabled submit button behavior', () => {
    const verifyAnswerMock = vi.mocked(verifyAnswer)

    renderQuestionCard()
    const input = screen.getByPlaceholderText('Type your answer...')
    const submitButton = screen.getByRole('button', { name: 'Submit' })

    expect(submitButton).toBeDisabled()
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(verifyAnswerMock).not.toHaveBeenCalled()
  })
})
