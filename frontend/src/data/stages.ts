import type { StageId } from '@/lib/types';

export interface StageDefinition {
  id: StageId;
  number: number;
  title: string;
  shortTitle: string;
  purpose: string;
  listenFor: string[];
  maySay: string[];
  guides: string[];
  outcomeLabel: string;
  outcomeOptions: string[];
}

export const STAGES: StageDefinition[] = [
  {
    id: 'opening',
    number: 1,
    title: 'Opening',
    shortTitle: 'Opening',
    purpose: 'Reach the right person and say who you are. The prospect decides in the first ten seconds whether this call is worth a minute.',
    listenFor: [
      'A switchboard or assistant answers and asks what the call is about',
      'The person answers but is somewhere else: driving, in a meeting, at lunch',
      'The number belongs to somebody who left the company a year ago',
    ],
    maySay: [
      'Who is this?',
      'Speaking, tell me.',
      'I am driving, can you call later?',
      'He is not in the office. What is this regarding?',
      'I am in a meeting right now.',
    ],
    guides: [
      'Give your name and company in the first sentence',
      'Use the prospect\'s name once, then stop using it',
      'Ask whether it is a fair moment before saying anything else',
      'If you reach a switchboard, give a reason a receptionist can repeat',
    ],
    outcomeLabel: 'Who answered',
    outcomeOptions: ['right_person', 'assistant', 'wrong_person', 'left_company', 'no_answer'],
  },
  {
    id: 'purpose',
    number: 2,
    title: 'Purpose',
    shortTitle: 'Purpose',
    purpose: 'Say in one or two sentences why you called, in words the prospect can repeat to a colleague. A purpose they cannot repeat is a purpose they did not hear.',
    listenFor: [
      'They ask what the company does, often twice, because the first answer was a label',
      'They ask where you got their number',
      'They guess it is a sales call and say so',
    ],
    maySay: [
      'What exactly do you do?',
      'Who gave you my number?',
      'Is this a sales call?',
      'Where did you get our details?',
      'What is Meridian? Never heard of it.',
    ],
    guides: [
      'Use one concrete sentence: study your company, industry and competitors, prepare a short report',
      'Name the artefact, not the methodology',
      'Do not list services or use words like "synergy" or "holistic"',
      'Answer "where did you get the number" plainly and once',
    ],
    outcomeLabel: 'Reaction',
    outcomeOptions: ['understood_purpose', 'asked_for_clarity', 'asked_source', 'assumed_sales', 'dismissed'],
  },
  {
    id: 'permission',
    number: 3,
    title: 'Permission',
    shortTitle: 'Permission',
    purpose: 'Find out whether they are willing to talk now. A clear yes, a clear no, or a time to call back are all good outcomes. Talking on without one is not.',
    listenFor: [
      'Call me after two, call me tomorrow, send it on WhatsApp first',
      'A short yes, and then they go quiet and wait',
      'They keep talking without answering, which is not a yes',
    ],
    maySay: [
      'Call me after two.',
      'Send it on WhatsApp first.',
      'I am free now, go ahead.',
      'Tomorrow morning is better.',
      'No time now, call next week.',
    ],
    guides: [
      'Offer a time or a channel, not an open question',
      'If they name a time, repeat it back exactly',
      'A polite maybe is not permission; ask again once',
      'Do not continue into a pitch without a clear yes',
    ],
    outcomeLabel: 'Permission',
    outcomeOptions: ['yes_now', 'call_back_later', 'send_first', 'no_permission', 'unclear'],
  },
  {
    id: 'their_business',
    number: 4,
    title: 'Their business',
    shortTitle: 'Their business',
    purpose: 'Ask about their company and their work before saying anything about yours. People talk about what they do; they rarely listen to what you do.',
    listenFor: [
      'They answer in one line and wait for the pitch',
      'They correct you: they do not make that, they are not that size, that is a different division',
      'They ask you to tell them about yourself first',
    ],
    maySay: [
      'We make speciality chemicals for pharma.',
      'We are a back office. Nothing of that sort happens here.',
      'That is a different division.',
      'We have plants in two states.',
      'We are not that large.',
    ],
    guides: [
      'Ask what the company makes or sells today',
      'Ask which part of the business they are responsible for',
      'Write down the correction if you had the wrong picture',
      'Do not ask more than two questions before letting them talk',
    ],
    outcomeLabel: 'What you learned',
    outcomeOptions: ['business_understood', 'corrected_you', 'rushed_to_pitch', 'wrong_division', 'not_relevant'],
  },
  {
    id: 'their_need',
    number: 5,
    title: 'Their need, in their words',
    shortTitle: 'Their need',
    purpose: 'Hear what they are trying to do or struggling with, in their own words. This is the one stage where the caller writes down exactly what was said.',
    listenFor: [
      'They name a goal: a new market, a new product line, a plant running below capacity',
      'They say everything is fine and there is nothing they need',
      'They turn it around and ask what you can do for a company like theirs',
    ],
    maySay: [
      'We want to push the new product line into two more states this year.',
      'Everything is running fine, nothing we need right now.',
      'We want higher margin customers, not more volume.',
      'We are adding a second plant next year.',
      'Our margins are under pressure from input costs.',
    ],
    guides: [
      'Ask one open question, then stop talking',
      'Record the exact words in the box, not your summary',
      'Repeat the words back to check you heard them correctly',
      'If they say "everything is fine", ask what would make next year better',
    ],
    outcomeLabel: 'Need heard',
    outcomeOptions: ['need_named', 'goal_named', 'nothing_needed', 'turned_it_around', 'unclear'],
  },
  {
    id: 'objection',
    number: 6,
    title: 'Objection',
    shortTitle: 'Objection',
    purpose: 'Hear the reason for a no and understand it. A reason you understand can be answered on this call or the next; a reason you talked over cannot.',
    listenFor: [
      'We already have an agency, a consultant, an in-house team',
      'Not the right person; speak to marketing, speak to the owner',
      'Send something in writing and we will see',
    ],
    maySay: [
      'We already have a CA who files everything.',
      'We have an in-house team for this.',
      'Send something in writing and we will see.',
      'I am not the right person. Speak to marketing.',
      'This is a back office. Nothing of that sort happens here.',
    ],
    guides: [
      'Let them finish the reason before responding',
      'Ask what the existing arrangement covers well',
      'Do not argue or repeat the pitch louder',
      'A referral to a colleague is a good outcome, so ask for the name',
    ],
    outcomeLabel: 'Reason for no',
    outcomeOptions: ['has_agency', 'has_in_house', 'not_right_person', 'send_written', 'no_budget', 'no_reason'],
  },
  {
    id: 'next_step',
    number: 7,
    title: 'Next step',
    shortTitle: 'Next step',
    purpose: 'Agree one concrete thing: a document on WhatsApp or email, a call at a named time, a meeting. One thing, named, with a time or a channel.',
    listenFor: [
      'A yes to receiving a document, which may be politeness rather than interest',
      'A time named by them, which is worth more than a time proposed by you',
      'A referral to a colleague, with or without a number',
    ],
    maySay: [
      'Send it on WhatsApp.',
      'Call me Tuesday after two.',
      'Email it to me and I will look.',
      'Speak to my colleague, he handles this.',
      'We will see, send something.',
    ],
    guides: [
      'Agree exactly one action and one time or channel',
      'Prefer a time the prospect names over one you propose',
      'Repeat the next step back before you end the call',
      'Write it in the record, not only in your memory',
    ],
    outcomeLabel: 'Agreed next step',
    outcomeOptions: ['meeting_set', 'call_scheduled', 'document_whatsapp', 'document_email', 'referral', 'no_next_step'],
  },
  {
    id: 'close',
    number: 8,
    title: 'Close',
    shortTitle: 'Close',
    purpose: 'End the call clearly and record what happened: the outcome, the next step, and the prospect\'s words from stage 5. The record is what the next call is built on.',
    listenFor: [
      'The call ends mid-sentence, because the line dropped or they hung up',
      'A warm goodbye after a no, which is still a no',
      'The caller logs an outcome that does not match what was said on the call',
    ],
    maySay: [
      'Thank you, send it across.',
      'Okay, bye.',
      'No, thank you.',
      'I will look at it and get back.',
      'The line is breaking, call again.',
    ],
    guides: [
      'Repeat the next step and the time once before saying goodbye',
      'Log the outcome that matches what was actually said',
      'Copy the stage 5 words into the record before you leave the screen',
      'End with one clear sentence, not a trailing "so yeah"',
    ],
    outcomeLabel: 'How the call ended',
    outcomeOptions: ['clear_agreement', 'polite_no', 'hung_up', 'line_dropped', 'voicemail'],
  },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((stage) => [stage.id, stage])) as Record<
  StageId,
  StageDefinition
>;

export const OUTCOME_LABELS: Record<string, string> = {
  next_step_agreed: 'Next step agreed',
  agreed_to_receive_report: 'Agreed to receive report',
  interested: 'Interested',
  follow_up: 'Follow up',
  call_again: 'Call again',
  not_interested: 'Not interested',
  do_not_call: 'Do not call',
  wrong_person: 'Wrong person',
  moved_company: 'Moved company',
  not_logged: 'Not logged',
};
