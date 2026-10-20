import type { Person } from "../bill";
import type { Contact } from "../contact";
import type { Account } from "../payment";

export interface PaymentEditorProps {
  person: Person;
  onChange: (accounts: Account[]) => void;
}

export interface SavedPeopleSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (contact: Contact) => void;
  // Names already on this bill: shown, but not pickable twice.
  taken: string[];
}
