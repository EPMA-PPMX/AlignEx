import React from 'react';
import FormFieldsManagement from './FormFieldsManagement';

const IssuesFieldsManagement: React.FC = () => {
  return (
    <FormFieldsManagement
      entityType="issue"
      title="Issues Form Configuration"
      description="Configure custom fields for issue forms. These fields will appear when creating or editing issues."
    />
  );
};

export default IssuesFieldsManagement;
