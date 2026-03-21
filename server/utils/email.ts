// Email notification stubs (console logging)
// In production, replace with SendGrid, AWS SES, or similar

export function sendEmail(to: string, subject: string, body: string): void {
  console.log("📧 [EMAIL]", {
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
  });
}

export function notifyPollOpened(to: string, eventTitle: string, pollType: string): void {
  sendEmail(
    to,
    `Poll Opened: ${eventTitle}`,
    `A new ${pollType} poll has been opened for ${eventTitle}. Visit Golf Day OS to cast your vote!`
  );
}

export function notifyPollClosing(to: string, eventTitle: string, hoursRemaining: number): void {
  sendEmail(
    to,
    `Poll Closing Soon: ${eventTitle}`,
    `The poll for ${eventTitle} closes in ${hoursRemaining} hours. Make sure to vote!`
  );
}

export function notifyRsvpOpened(to: string, eventTitle: string, date: string, course: string): void {
  sendEmail(
    to,
    `RSVP Now: ${eventTitle}`,
    `RSVP is now open for ${eventTitle} at ${course} on ${date}. Secure your spot!`
  );
}

export function notifySpotAvailable(to: string, eventTitle: string, expiresAt: string): void {
  sendEmail(
    to,
    `Spot Available: ${eventTitle}`,
    `A spot has opened up for ${eventTitle}! You have until ${expiresAt} to claim it.`
  );
}

export function notifyRosterLocked(to: string, eventTitle: string): void {
  sendEmail(
    to,
    `Roster Finalized: ${eventTitle}`,
    `The roster for ${eventTitle} has been finalized. Check the details on Golf Day OS.`
  );
}

export function notifyTeeSheetPosted(to: string, eventTitle: string): void {
  sendEmail(
    to,
    `Tee Sheet Ready: ${eventTitle}`,
    `The tee sheet for ${eventTitle} is now available. Download it from Golf Day OS!`
  );
}

export function notifyGroupInvite(to: string, inviterName: string, groupName: string, joinCode: string, joinUrl: string): void {
  sendEmail(
    to,
    `You're invited to join ${groupName} on Golf Day OS`,
    `${inviterName} has invited you to join "${groupName}" on Golf Day OS.\n\nUse this join code to join: ${joinCode}\n\nOr click this link: ${joinUrl}\n\nGolf Day OS helps groups organize golf events with course polls, RSVPs, and tee sheet management.`
  );
}
