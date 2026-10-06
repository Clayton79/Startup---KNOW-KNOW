import { LIMITS } from '@know-know/shared';
import { useMemo } from 'react';
import { SkillChipPicker } from './skill-chip-picker';

/** Escolhe o que a pessoa quer aprender. */
export function LearningSkillsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selectedIds = useMemo(() => new Set(value), [value]);

  const toggle = (skillId: string) =>
    onChange(selectedIds.has(skillId) ? value.filter((id) => id !== skillId) : [...value, skillId]);

  return (
    <SkillChipPicker
      label="conhecimentos que você quer aprender"
      selectedIds={selectedIds}
      onToggle={toggle}
      max={LIMITS.maxLearningSkills}
    />
  );
}
