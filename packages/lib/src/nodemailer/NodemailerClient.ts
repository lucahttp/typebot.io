import {
  Config,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  ServiceMap,
} from "effect";
import { createTransport, type SendMailOptions } from "nodemailer";

export class NodemailerError extends Schema.TaggedErrorClass<NodemailerError>()(
  "@typebot/NodemailerError",
  {
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class NodemailerClient extends ServiceMap.Service<
  NodemailerClient,
  {
    sendMail: (
      options: SendMailOptions,
    ) => Effect.Effect<void, NodemailerError>;
  }
>()("@typebot/NodemailerClient") {
  static readonly layer = Layer.unwrap(
    Effect.gen(function* () {
      const hostOpt = yield* Config.string("SMTP_HOST").pipe(Config.option);

      if (Option.isNone(hostOpt)) {
        return Layer.succeed(
          NodemailerClient,
          NodemailerClient.of({
            sendMail: (options: SendMailOptions) =>
              Effect.logWarning("SMTP is not configured. Email not sent", {
                email: options,
              }),
          }),
        );
      }

      const host = hostOpt.value;
      const port = yield* Config.port("SMTP_PORT").pipe(Config.withDefault(25));
      const secure = yield* Config.boolean("SMTP_SECURE").pipe(
        Config.withDefault(false),
      );
      const ignoreTLS = yield* Config.boolean("SMTP_IGNORE_TLS").pipe(
        Config.withDefault(undefined),
      );
      const userOpt = yield* Config.string("SMTP_USERNAME").pipe(Config.option);
      const passOpt = yield* Config.redacted("SMTP_PASSWORD").pipe(
        Config.option,
      );
      const from = yield* Config.string("NEXT_PUBLIC_SMTP_FROM").pipe(
        Config.withDefault("noreply@localhost"),
      );

      const auth =
        Option.isSome(userOpt) && Option.isSome(passOpt)
          ? {
              user: userOpt.value,
              pass: Redacted.value(passOpt.value),
            }
          : undefined;

      const transport = createTransport(
        {
          host,
          port,
          secure,
          ignoreTLS,
          auth,
        },
        {
          from,
        },
      );

      return Layer.succeed(
        NodemailerClient,
        NodemailerClient.of({
          sendMail: (options: SendMailOptions) =>
            Effect.tryPromise({
              try: () => transport.sendMail(options),
              catch: (error) => new NodemailerError({ cause: error }),
            }),
        }),
      );
    }),
  );
}

export const NodemailerClientLayer = NodemailerClient.layer;
