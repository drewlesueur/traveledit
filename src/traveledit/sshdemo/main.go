// https://gist.github.com/atotto/ba19155295d95c8d75881e145c751372
// http://networkbit.ch/golang-ssh-client/

package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	scp "github.com/bramvdbogaerde/go-scp"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/terminal"
)

func main() {

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		if err := run(ctx); err != nil {
			log.Print(err)
		}
		cancel()
	}()

	select {
	case <-sig:
		cancel()
	case <-ctx.Done():
	}
}

func run(ctx context.Context) error {
	host := "example.com"
	hostKey := getHostKey(host)

	hostport := host + ":22"
	config := &ssh.ClientConfig{
		User: "*****",
		Auth: []ssh.AuthMethod{
			ssh.Password("*****"),
		},
		Timeout: 5 * time.Second,
		// HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		HostKeyCallback: ssh.FixedHostKey(hostKey),
	}

	conn, err := ssh.Dial("tcp", hostport, config)
	if err != nil {
		return fmt.Errorf("cannot connect %v: %v", hostport, err)
	}
	defer conn.Close()

	session, err := conn.NewSession()
	if err != nil {
		return fmt.Errorf("cannot open new session: %v", err)
	}
	defer session.Close()
	// b, err := session.Output("cat nonexist")
	// b, err := session.Output("echo the date is $(date)")
	// if err != nil {
	// 	exitErr, ok := err.(*ssh.ExitError)
	// 	if ok {
	// 		log.Printf("err is: %v", exitErr)
	// 		panic(err)
	// 	}
	// }
	// log.Printf("%s", string(b))

	scpClient, err := scp.NewClientBySSH(conn)
	if err != nil {
		panic(err)
	}
	f, err := os.Open("./run.sh")
	if err != nil {
		panic(err)
	}
	defer f.Close()
	err = scpClient.CopyFromFile(context.Background(), *f, "/tmp/delme_drew", "0644")
	if err != nil {
		panic(err)
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	term := "xterm-256color"
	if err := session.RequestPty(term, 30, 120, modes); err != nil {
		panic(err)
	}

	fd := int(os.Stdin.Fd())
	state, err := terminal.MakeRaw(fd)
	if err != nil {
		return fmt.Errorf("terminal make raw: %s", err)
	}
	defer terminal.Restore(fd, state)

	session.Stdout = os.Stdout
	session.Stderr = os.Stderr
	session.Stdin = os.Stdin

	if err := session.Shell(); err != nil {
		return fmt.Errorf("session shell: %s", err)
	}

	if err := session.Wait(); err != nil {
		if e, ok := err.(*ssh.ExitError); ok {
			switch e.ExitStatus() {
			case 130:
				return nil
			}
		}
		return fmt.Errorf("ssh: %s", err)
	}

	go func() {
		<-ctx.Done()
		conn.Close()
	}()

	// fd := int(os.Stdin.Fd())
	// state, err := terminal.MakeRaw(fd)
	// if err != nil {
	// 	return fmt.Errorf("terminal make raw: %s", err)
	// }
	// defer terminal.Restore(fd, state)
	//
	// w, h, err := terminal.GetSize(fd)
	// if err != nil {
	// 	return fmt.Errorf("terminal get size: %s", err)
	// }
	//
	// modes := ssh.TerminalModes{
	// 	ssh.ECHO:          1,
	// 	ssh.TTY_OP_ISPEED: 14400,
	// 	ssh.TTY_OP_OSPEED: 14400,
	// }
	//
	// term := os.Getenv("TERM")
	// if term == "" {
	// 	term = "xterm-256color"
	// }
	// if err := session.RequestPty(term, h, w, modes); err != nil {
	// 	return fmt.Errorf("session xterm: %s", err)
	// }
	// session.Stdout = os.Stdout
	// session.Stderr = os.Stderr
	// session.Stdin = os.Stdin
	//
	// if err := session.Shell(); err != nil {
	// 	return fmt.Errorf("session shell: %s", err)
	// }
	//
	// if err := session.Wait(); err != nil {
	// 	if e, ok := err.(*ssh.ExitError); ok {
	// 		switch e.ExitStatus() {
	// 		case 130:
	// 			return nil
	// 		}
	// 	}
	// 	return fmt.Errorf("ssh: %s", err)
	// }
	return nil
}

func getHostKey(host string) ssh.PublicKey {
	// parse OpenSSH known_hosts file
	// ssh or use ssh-keyscan to get initial key
	file, err := os.Open(filepath.Join(os.Getenv("HOME"), ".ssh", "known_hosts"))
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	var hostKey ssh.PublicKey
	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), " ")
		if len(fields) != 3 {
			continue
		}
		if strings.Contains(fields[0], host) {
			var err error
			hostKey, _, _, _, err = ssh.ParseAuthorizedKey(scanner.Bytes())
			if err != nil {
				log.Fatalf("error parsing %q: %v", fields[2], err)
			}
			break
		}
	}

	if hostKey == nil {
		log.Fatalf("no hostkey found for %s", host)
	}

	return hostKey
}
