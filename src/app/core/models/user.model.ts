export interface User {
  id: number;
  gender: string;
  role: string; // This will store the role code directly
  name: {
    first: string;
    last: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    postcode: number; // Or string, depending on API
  };
  email: string;
  username: string;
  password?: string;
  phone: string;
  cell: string;
  picture: {
    large: string;
  };
}
