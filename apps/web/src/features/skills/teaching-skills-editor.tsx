import { LIMITS, SkillLevel } from '@know-know/shared';
import { useMemo } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { useSkillCatalog } from '@/features/profile/use-profile';
import { SKILL_LEVEL_LABEL } from '@/lib/labels';
import { SkillChipPicker } from './skill-chip-picker';

export interface TeachingDraft {
  skillId: string;
  level: SkillLevel;
  description: string;
}

/** Escolhe o que a pessoa ensina e, para cada item, o nível e uma descrição curta. */
export function TeachingSkillsEditor({
  value,
  onChange,
}: {
  value: TeachingDraft[];
  onChange: (next: TeachingDraft[]) => void;
}) {
  const { data: catalog } = useSkillCatalog();
  const selectedIds = useMemo(() => new Set(value.map((item) => item.skillId)), [value]);
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of catalog ?? [])
      for (const skill of category.skills) map.set(skill.id, skill.name);
    return map;
  }, [catalog]);

  const toggle = (skillId: string) => {
    if (selectedIds.has(skillId)) onChange(value.filter((item) => item.skillId !== skillId));
    else onChange([...value, { skillId, level: SkillLevel.INTERMEDIATE, description: '' }]);
  };

  const update = (skillId: string, patch: Partial<TeachingDraft>) =>
    onChange(value.map((item) => (item.skillId === skillId ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-6">
      <SkillChipPicker
        label="conhecimentos que você ensina"
        selectedIds={selectedIds}
        onToggle={toggle}
        max={LIMITS.maxTeachingSkills}
      />

      {value.length > 0 ? (
        <ul className="space-y-4">
          {value.map((item) => (
            <li
              key={item.skillId}
              className="space-y-3 rounded-lg border border-border bg-surface-muted p-4"
            >
              <p className="font-bold">{names.get(item.skillId) ?? 'Conhecimento'}</p>
              <FormField label="Seu nível">
                {(control) => (
                  <Select
                    {...control}
                    value={item.level}
                    onChange={(event) =>
                      update(item.skillId, { level: event.target.value as SkillLevel })
                    }
                  >
                    {Object.values(SkillLevel).map((level) => (
                      <option key={level} value={level}>
                        {SKILL_LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
              <FormField
                label="O que você pode ensinar? (opcional)"
                hint={`Até ${LIMITS.skillDescription.max} caracteres.`}
              >
                {(control) => (
                  <Textarea
                    {...control}
                    rows={2}
                    maxLength={LIMITS.skillDescription.max}
                    value={item.description}
                    onChange={(event) => update(item.skillId, { description: event.target.value })}
                  />
                )}
              </FormField>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
