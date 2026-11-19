/** An expected document error with the HTTP status to answer with. */
export class DocumentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
