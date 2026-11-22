import React from 'react';
import { GoogleCelebrationModal } from './GoogleCelebrationModal';
import { ResultCelebrationType } from '@ignitron/shared';

export interface ResultCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResultCelebrationType;
  title: string;
  message: string;
  teamName: string;
  roundName?: string;
  nextRoundName?: string;
  winnerTeamName?: string | null;
  winnerScore?: number;
  winnerInstitution?: string | null;
  runnerUpTeamName?: string | null;
  runnerUpScore?: number;
  runnerUpInstitution?: string | null;
}

export const ResultCelebrationModal: React.FC<ResultCelebrationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  teamName,
  roundName,
  nextRoundName,
  winnerTeamName,
  winnerScore,
  winnerInstitution,
  runnerUpTeamName,
  runnerUpScore,
  runnerUpInstitution,
}) => {
  if (!isOpen) return null;

  // Determine mode
  const mode =
    type === 'GRAND_WINNER'
      ? 'WINNER'
      : type === 'QUALIFIED'
      ? 'ROUND_QUALIFIED'
      : 'STANDARD';

  return (
    <GoogleCelebrationModal
      isOpen={isOpen}
      onClose={onClose}
      mode={mode}
      title={type === 'GRAND_WINNER' ? '🎉 Grand Champions!' : title || 'Congratulations!'}
      subtext={message || "You nailed it! You've successfully completed the challenge."}
      teamName={teamName}
      roundName={roundName}
      nextRoundName={nextRoundName}
      winnerTeamName={winnerTeamName}
      winnerScore={winnerScore}
      winnerInstitution={winnerInstitution}
      runnerUpTeamName={runnerUpTeamName}
      runnerUpScore={runnerUpScore}
      runnerUpInstitution={runnerUpInstitution}
      buttonLabel="Awesome"
    />
  );
};
