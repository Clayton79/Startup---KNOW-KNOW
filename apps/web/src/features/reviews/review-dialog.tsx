import {
  LIMITS,
  REVIEW_CATEGORIES_BY_DIRECTION,
  type ReviewCategory,
  type ReviewDirection,
} from '@know-know/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StarRating } from '@/components/ui/star-rating';
import { sessionKeys } from '@/features/sessions/use-sessions';
import { reviewsApi } from './reviews-api';

const CATEGORY_LABEL: Record<ReviewCategory, string> = {
  DIDACTICS: 'Didática (explica bem?)',
  KNOWLEDGE: 'Conhecimento do assunto',
  PUNCTUALITY: 'Pontualidade',
  PARTICIPATION: 'Participação',
  RESPECT: 'Respeito',
};

export function ReviewDialog({
  sessionId,
  direction,
  personName,
  open,
  onOpenChange,
}: {
  sessionId: string;
  direction: ReviewDirection;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const categories = REVIEW_CATEGORIES_BY_DIRECTION[direction];
  const [scores, setScores] = useState<Partial<Record<ReviewCategory, number>>>({});
  const [comment, setComment] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      reviewsApi.create(sessionId, {
        scores: categories.map((category) => ({ category, score: scores[category] as number })),
        comment: comment.trim() === '' ? null : comment.trim(),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });

  const submit = async () => {
    if (categories.some((category) => !scores[category])) {
      setShowErrors(true);
      return;
    }
    try {
      await mutation.mutateAsync();
      toast.success('Avaliação enviada. Obrigado!');
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Avalie ${personName}`}
      description="Sua avaliação ajuda outras pessoas a decidir. Seja justo e gentil."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          <Button loading={mutation.isPending} onClick={() => void submit()}>
            Enviar avaliação
          </Button>
        </>
      }
    >
      {categories.map((category) => (
        <StarRating
          key={category}
          label={CATEGORY_LABEL[category]}
          value={scores[category] ?? null}
          onChange={(score) => setScores((current) => ({ ...current, [category]: score }))}
          error={showErrors && !scores[category] ? 'Escolha uma nota de 1 a 5.' : undefined}
        />
      ))}
      <FormField label="Comentário (opcional)" hint={`Até ${LIMITS.reviewComment.max} caracteres.`}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            maxLength={LIMITS.reviewComment.max}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
