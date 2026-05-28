import { ChatApp } from '../../../components/ai-agent/ChatApp'
import { PortalLayout } from '../../../components/layout/PortalLayout'

export default function AiAgentChatPage() {
  return (
    <PortalLayout flush title="Agent-AI">
      <ChatApp embedded />
    </PortalLayout>
  )
}
