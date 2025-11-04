module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { student, score, correctAnswers, totalQuestions, timeSpent } = req.body;

    // Validate required fields
    if (!student || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Your Telegram Bot configuration
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Telegram credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Format the message
    const message = formatTelegramMessage(student, score, correctAnswers, totalQuestions, timeSpent);

    // Send message to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        }),
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      console.error('Telegram API error:', telegramData);
      return res.status(500).json({ error: 'Failed to send notification' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Results submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function formatTelegramMessage(student, score, correctAnswers, totalQuestions, timeSpent) {
  const timestamp = new Date().toLocaleString();
  const emoji = score >= 80 ? '🎉' : score >= 60 ? '👍' : '📚';
  
  return `
<b>📊 New Test Result</b> ${emoji}

<b>Student:</b> ${student}
<b>Score:</b> ${score}%
<b>Correct Answers:</b> ${correctAnswers}/${totalQuestions}
<b>Time Spent:</b> ${formatTime(timeSpent)}

<b>Date:</b> ${timestamp}

${getPerformanceMessage(score)}
  `.trim();
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getPerformanceMessage(score) {
  if (score >= 90) return '🏅 <b>Excellent performance!</b>';
  if (score >= 80) return '⭐ <b>Very good!</b>';
  if (score >= 70) return '✅ <b>Good job!</b>';
  if (score >= 60) return '📝 <b>Not bad, keep practicing!</b>';
  return '📖 <b>More practice needed.</b>';
}
