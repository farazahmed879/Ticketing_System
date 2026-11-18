/**
 * Whether the logged-in user's role may delete records. False only for
 * delete-restricted roles (Sub Admin: admin rights minus delete, role
 * `canDelete: false`). The backend enforces this; the UI uses it to hide
 * Delete buttons.
 *
 * Module-level (not a hook) so plain column-builder functions can use it too.
 * AuthContext keeps it in sync with the current user.
 */
let deleteAllowed = true;

export const setDeleteAllowed = (allowed: boolean) => {
  deleteAllowed = allowed;
};

export const canDeleteRecords = () => deleteAllowed;
