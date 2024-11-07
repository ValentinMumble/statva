type FTPTest = {
  id: string;
  date: Date;
  weight: number;
  ftp: number;
};

type GetFtp = (date: Date) => number;

export type {FTPTest, GetFtp};
