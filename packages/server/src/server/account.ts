import { AKEY, Account } from "../types";

export class AccountArray<T extends Account = Account> extends Array<T> {
  constructor(...items: T[]) {
    super(...items);
  }

  push(...items: T[]): number {
    // Your custom logic here
    console.log(`Pushed ${items.length} item(s)`, items);
    // Call the original push method to add items to the array
    return super.push(...items);
  }

  findValidAccounts(address: string) {
    return this.filter((currentAccount) => {
      return address === currentAccount[AKEY.EMAIL];
    });
  }
}
