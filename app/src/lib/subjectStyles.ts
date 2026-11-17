import type { CorMateria } from '../types'

interface SubjectStyle {
  dot: string
  text: string
  chip: string
  border: string
  bar: string
  ring: string
}

// Classes literais (o Tailwind precisa ver a string inteira no código-fonte para gerá-la)
export const SUBJECT_STYLES: Record<CorMateria, SubjectStyle> = {
  1: {
    dot: 'bg-subject-1',
    text: 'text-subject-1',
    chip: 'bg-subject-1/15 text-subject-1',
    border: 'border-subject-1',
    bar: 'bg-subject-1',
    ring: 'stroke-subject-1',
  },
  2: {
    dot: 'bg-subject-2',
    text: 'text-subject-2',
    chip: 'bg-subject-2/15 text-subject-2',
    border: 'border-subject-2',
    bar: 'bg-subject-2',
    ring: 'stroke-subject-2',
  },
  3: {
    dot: 'bg-subject-3',
    text: 'text-subject-3',
    chip: 'bg-subject-3/15 text-subject-3',
    border: 'border-subject-3',
    bar: 'bg-subject-3',
    ring: 'stroke-subject-3',
  },
  4: {
    dot: 'bg-subject-4',
    text: 'text-subject-4',
    chip: 'bg-subject-4/15 text-subject-4',
    border: 'border-subject-4',
    bar: 'bg-subject-4',
    ring: 'stroke-subject-4',
  },
  5: {
    dot: 'bg-subject-5',
    text: 'text-subject-5',
    chip: 'bg-subject-5/15 text-subject-5',
    border: 'border-subject-5',
    bar: 'bg-subject-5',
    ring: 'stroke-subject-5',
  },
  6: {
    dot: 'bg-subject-6',
    text: 'text-subject-6',
    chip: 'bg-subject-6/15 text-subject-6',
    border: 'border-subject-6',
    bar: 'bg-subject-6',
    ring: 'stroke-subject-6',
  },
}
