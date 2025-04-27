package domain

// Slack関連のイベント用構造体（必要最小限のみ）
type SlackEvent struct {
	Type      string `json:"type"`
	Event     Event  `json:"event"`
	Challenge string `json:"challenge"`
}

type Event struct {
	Type    string `json:"type"`
	User    string `json:"user"`
	Text    string `json:"text"`
	Channel string `json:"channel"`
	Ts      string `json:"ts"`
}
