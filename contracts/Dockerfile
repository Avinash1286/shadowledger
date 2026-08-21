FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/scarb /tmp/foundry /tmp/usc \
    && curl --proto '=https' --tlsv1.2 -fsSL \
      https://github.com/software-mansion/scarb/releases/download/v2.20.1/scarb-v2.20.1-x86_64-unknown-linux-gnu.tar.gz \
      -o /tmp/scarb.tar.gz \
    && echo '6795b268da13c8ff397a0f5e4b7a63f4b2b313d8a5e41fff36626087279c4804  /tmp/scarb.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/scarb.tar.gz -C /tmp/scarb \
    && install "$(find /tmp/scarb -type f -name scarb | head -n 1)" /usr/local/bin/scarb \
    && curl --proto '=https' --tlsv1.2 -fsSL \
      https://github.com/foundry-rs/starknet-foundry/releases/download/v0.63.0/starknet-foundry-v0.63.0-x86_64-unknown-linux-gnu.tar.gz \
      -o /tmp/foundry.tar.gz \
    && echo 'a861c13238fe0686e921820b9606065cf07b1ccc6cc22d95cd299cd78b37a869  /tmp/foundry.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/foundry.tar.gz -C /tmp/foundry \
    && install "$(find /tmp/foundry -type f -name snforge | head -n 1)" /usr/local/bin/snforge \
    && install "$(find /tmp/foundry -type f -name sncast | head -n 1)" /usr/local/bin/sncast \
    && curl --proto '=https' --tlsv1.2 -fsSL \
      https://github.com/software-mansion/universal-sierra-compiler/releases/download/v2.10.0/universal-sierra-compiler-v2.10.0-x86_64-unknown-linux-gnu.tar.gz \
      -o /tmp/usc.tar.gz \
    && echo 'eafa433885c32947fbe640937a12543d468a0e2905b62c177f0fd8099285c1b9  /tmp/usc.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/usc.tar.gz -C /tmp/usc \
    && install "$(find /tmp/usc -type f -name universal-sierra-compiler | head -n 1)" /usr/local/bin/universal-sierra-compiler \
    && rm -rf /tmp/scarb /tmp/foundry /tmp/usc /tmp/scarb.tar.gz /tmp/foundry.tar.gz /tmp/usc.tar.gz

WORKDIR /workspace
CMD ["bash"]
