import React from 'react';
import FormFieldsManagement from './FormFieldsManagement';

const RiskFieldsManagement: React.FC = () => {
  return (
    <FormFieldsManagement
      entityType="risk"
      title="Risk Form Configuration"
      description="Configure custom fields for risk forms. These fields will appear when creating or editing risks."
    />
  );
};

export default RiskFieldsManagement;
