type SubscribeToCompletion = (listener: () => void) => () => void;

type CloseAfterCancellationOptions = {
  requestCancel: () => boolean;
  onCompleted: SubscribeToCompletion;
  closeWindow: () => void;
};

export function closeWindowAfterCancellation(
  options: CloseAfterCancellationOptions,
): void {
  const unsubscribe = options.onCompleted(() => {
    unsubscribe();
    options.closeWindow();
  });

  const requested = options.requestCancel();
  if (!requested) {
    unsubscribe();
    options.closeWindow();
  }
}
