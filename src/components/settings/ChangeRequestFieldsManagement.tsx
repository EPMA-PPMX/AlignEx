import React from 'react';
import FormFieldsManagement from './FormFieldsManagement';

const ChangeRequestFieldsManagement: React.FC = () => {
  return (
    <FormFieldsManagement
      entityType="change_request"
      title="Change Request Form Configuration"
      description="Configure custom fields for change request forms. These fields will appear when creating or editing change requests."
    />
  );
};

export default ChangeRequestFieldsManagement;
