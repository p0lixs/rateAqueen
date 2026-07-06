export type Queen = {
  id: string;
  name: string;
  image_url: string;
};

export type Invitation = {
  name: string;
  nickname: string;
  token?: string;
  has_voted: boolean;
};

export type EventInfo = {
  title: string;
  status: "registration" | "voting" | "results";
  queens: Queen[];
  voter: { name: string; nickname: string; has_voted: boolean };
  votes_cast: number;
  votes_total: number;
};

export type Result = Queen & {
  average: number;
  first_places: number;
};
