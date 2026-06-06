import { createRecordHandler } from "./createRecordHandler";
import { deleteRecordHandler } from "./deleteRecordHandler";
import { listTablesFetcherHandler } from "./fetchersHandler";
import { getRecordHandler } from "./getRecordHandler";
import { searchRecordsHandler } from "./searchRecordsHandler";
import { updateRecordHandler } from "./updateRecordHandler";

export default [
  createRecordHandler,
  getRecordHandler,
  searchRecordsHandler,
  updateRecordHandler,
  deleteRecordHandler,
  listTablesFetcherHandler,
];
