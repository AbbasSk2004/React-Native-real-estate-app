export const AGENT_SPECIALTIES = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Industrial', label: 'Industrial' },
  { value: 'Land', label: 'Land' },
  { value: 'Luxury', label: 'Luxury Properties' },
  { value: 'Investment', label: 'Investment Properties' }
];

export const EXPERIENCE_LEVELS = [
  { value: '1-2 years', label: '1-2 years' },
  { value: '3-5 years', label: '3-5 years' },
  { value: '5+ years', label: '5+ years' },
  { value: '10+ years', label: '10+ years' }
];

export const experienceLabel = (exp) => {
  if (!exp) return '';
  return exp;
};

export const getAgentFullName = (agent) => {
  return `${agent.profiles?.firstname || ''} ${agent.profiles?.lastname || ''}`.trim() || agent.full_name || 'Unknown Agent';
};

export const getAgentProfilePhoto = (agent) => {
  return agent.profiles?.profile_photo || agent.image || "/img/agent-placeholder.jpg";
}; 